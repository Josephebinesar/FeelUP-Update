"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at?: string | null;
};

export default function ExploreClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [me, setMe] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const logErr = (label: string, err: any) => {
    const msg =
      (typeof err?.message === "string" && err.message) ||
      (typeof err === "string" && err) ||
      "Unknown error";
    const code =
      (typeof err?.code === "string" && err.code) ||
      (typeof err?.status === "number" ? String(err.status) : "");
    console.error(`${label} ${code ? `[${code}]` : ""} ${msg}`);
  };

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) logErr("Explore auth error:", error);

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setMe(data.user);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* ---------------- LOAD USERS ---------------- */

  const loadUsers = useCallback(async () => {
    // ✅ include created_at if you order by it
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      logErr("Explore fetch users error:", error);
      return [];
    }

    return (data || []) as Profile[];
  }, [supabase]);

  /* ---------------- LOAD FOLLOWING ---------------- */

  const loadFollowing = useCallback(
    async (myId: string) => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", myId);

      if (error) {
        logErr("Explore load following error:", error);
        return {};
      }

      const map: Record<string, boolean> = {};
      (data || []).forEach((row: any) => {
        if (row.following_id) map[row.following_id] = true;
      });

      return map;
    },
    [supabase]
  );

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      if (!me?.id) return;

      setLoading(true);

      const [profiles, following] = await Promise.all([loadUsers(), loadFollowing(me.id)]);

      if (!mounted) return;

      // don't show self
      setUsers(profiles.filter((p) => p.id !== me.id));
      setFollowingMap(following);
      setLoading(false);
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, [me?.id, loadUsers, loadFollowing]);

  /* ---------------- REALTIME FOLLOW UPDATES ---------------- */
  useEffect(() => {
    if (!me?.id) return;

    const ch = supabase
      .channel(`realtime-follows-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, (payload) => {
        const rowNew = payload.new as any;
        const rowOld = payload.old as any;

        // Update only when I am the follower
        const followerId = rowNew?.follower_id || rowOld?.follower_id || null;
        if (followerId !== me.id) return;

        const followingId = rowNew?.following_id || rowOld?.following_id || null;
        if (!followingId) return;

        if (payload.eventType === "INSERT") {
          setFollowingMap((p) => ({ ...p, [followingId]: true }));
        } else if (payload.eventType === "DELETE") {
          setFollowingMap((p) => {
            const next = { ...p };
            delete next[followingId];
            return next;
          });
        } else if (payload.eventType === "UPDATE") {
          setFollowingMap((p) => ({ ...p, [followingId]: true }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, me?.id]);

  /* ---------------- DM CONNECT (✅ FIX) ---------------- */
  const connectToUser = async (otherUserId: string) => {
    if (!me?.id) return;

    setBusyId(otherUserId);

    const { data, error } = await supabase.rpc("connect_to_user", {
      other_user_id: otherUserId,
    });

    setBusyId(null);

    if (error) {
      alert(error.message);
      logErr("connect_to_user error:", error);
      return;
    }

    // ✅ data is conversationId
    router.push(`/messages/${data}`);
  };

  /* ---------------- ACTIONS ---------------- */

  const follow = async (userId: string) => {
    if (!me?.id) return;

    setBusyId(userId);

    const { error } = await supabase.from("follows").insert({
      follower_id: me.id,
      following_id: userId,
    });

    if (error) logErr("Follow error:", error);

    setBusyId(null);
    // realtime will update map
  };

  const unfollow = async (userId: string) => {
    if (!me?.id) return;

    setBusyId(userId);

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", me.id)
      .eq("following_id", userId);

    if (error) logErr("Unfollow error:", error);

    setBusyId(null);
    // realtime will update map
  };

  /* ---------------- FILTER ---------------- */

  const filteredUsers = users.filter((u) => {
    const name = `${u.full_name || ""} ${u.username || ""}`.trim();
    return name.toLowerCase().includes(search.toLowerCase());
  });

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 border">
          <p className="text-center text-gray-500">Loading people…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border p-6 mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
          <p className="text-sm text-gray-600 mt-1">
            Find people, follow them, and start a chat.
          </p>

          {/* Search */}
          <div className="mt-4">
            <input
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="Search by name or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">
            No users found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const displayName = u.full_name || u.username || "User";
              const handle = u.username ? `@${u.username}` : null;
              const isFollowing = !!followingMap[u.id];
              const isBusy = busyId === u.id;

              return (
                <div
                  key={u.id}
                  className="bg-white border rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  {/* Left */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 shrink-0">
                      {(displayName || "U").slice(0, 1).toUpperCase()}
                    </div>

                    {/* Names */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {displayName}
                        </p>
                        {isFollowing && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                            Following
                          </span>
                        )}
                      </div>
                      {handle && (
                        <p className="text-sm text-gray-500 truncate">
                          {handle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => router.push(`/profile/${u.id}`)}
                      className="px-3 py-2 text-sm rounded-xl border hover:bg-gray-50"
                      type="button"
                    >
                      View
                    </button>

                    {/* ✅ FIXED: use RPC connect_to_user -> conversationId */}
                    <button
                      disabled={isBusy}
                      onClick={() => connectToUser(u.id)}
                      className="px-3 py-2 text-sm rounded-xl border hover:bg-gray-50 disabled:opacity-50"
                      type="button"
                    >
                      {isBusy ? "Opening..." : "Message"}
                    </button>

                    {isFollowing ? (
                      <button
                        disabled={isBusy}
                        onClick={() => unfollow(u.id)}
                        className="px-4 py-2 text-sm rounded-xl bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                        type="button"
                      >
                        {isBusy ? "..." : "Unfollow"}
                      </button>
                    ) : (
                      <button
                        disabled={isBusy}
                        onClick={() => follow(u.id)}
                        className="px-4 py-2 text-sm rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                        type="button"
                      >
                        {isBusy ? "..." : "Follow"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Tip: Follow someone to see “Friend circle” posts if your feed uses
          followers visibility.
        </div>
      </div>
    </div>
  );
}
