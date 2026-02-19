"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

/** -------- Types -------- */

type ExploreUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at: string | null;
  avatar_path: string | null;
  last_active_at: string | null;

  follower_count: number;
  mutual_count: number;
  shared_interests: number;
};

type TrendingTag = { tag: string; uses: number };

type TabKey = "suggested" | "popular" | "new" | "all";

/** -------- Helpers -------- */

function daysAgo(dateIso?: string | null) {
  if (!dateIso) return null;
  const d = new Date(dateIso).getTime();
  if (Number.isNaN(d)) return null;
  const diff = Date.now() - d;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isNewUser(createdAt?: string | null) {
  const d = daysAgo(createdAt);
  return d !== null && d <= 7; // New = joined within 7 days
}

function isActiveThisWeek(lastActiveAt?: string | null) {
  const d = daysAgo(lastActiveAt);
  return d !== null && d <= 7;
}

function safeName(u: { full_name: string | null; username: string | null }) {
  return u.full_name || u.username || "User";
}

export default function ExploreClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [me, setMe] = useState<any>(null);

  // data
  const [suggested, setSuggested] = useState<ExploreUser[]>([]);
  const [allUsers, setAllUsers] = useState<ExploreUser[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [trending, setTrending] = useState<TrendingTag[]>([]);

  // UI state
  const [tab, setTab] = useState<TabKey>("suggested");
  const [search, setSearch] = useState("");
  const [interestFilter, setInterestFilter] = useState<string>(""); // text filter
  const [tagFilter, setTagFilter] = useState<string>(""); // trending tag filter
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

  /** -------- AUTH -------- */
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

  /** -------- Avatar URL (public bucket) -------- */
  const avatarUrl = useCallback(
    (avatar_path: string | null) => {
      if (!avatar_path) return null;
      // bucket name: avatars (public)
      const { data } = supabase.storage.from("avatars").getPublicUrl(avatar_path);
      return data?.publicUrl || null;
    },
    [supabase]
  );

  /** -------- Load following -------- */
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

  /** -------- Load my interests -------- */
  const loadMyInterests = useCallback(
    async (myId: string) => {
      const { data, error } = await supabase
        .from("profile_interests")
        .select("interest")
        .eq("profile_id", myId);

      if (error) {
        logErr("Explore load my interests error:", error);
        return [];
      }

      return (data || [])
        .map((x: any) => String(x.interest || "").trim())
        .filter(Boolean);
    },
    [supabase]
  );

  /** -------- Load suggested (algorithmic) -------- */
  const loadSuggested = useCallback(
    async (myId: string) => {
      const { data, error } = await supabase.rpc("get_explore_suggestions", {
        my_id: myId,
        limit_n: 60,
      });

      if (error) {
        logErr("Explore get_explore_suggestions error:", error);
        return [];
      }

      // normalize numbers
      return (data || []).map((u: any) => ({
        ...u,
        follower_count: Number(u.follower_count || 0),
        mutual_count: Number(u.mutual_count || 0),
        shared_interests: Number(u.shared_interests || 0),
      })) as ExploreUser[];
    },
    [supabase]
  );

  /** -------- Load all users (fallback + tab "all") -------- */
  const loadAllUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, created_at, avatar_path, last_active_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      logErr("Explore load all users error:", error);
      return [];
    }

    // If you don't store follower_count etc in this query, set 0; UI still works.
    return (data || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      created_at: u.created_at,
      avatar_path: u.avatar_path,
      last_active_at: u.last_active_at,
      follower_count: 0,
      mutual_count: 0,
      shared_interests: 0,
    })) as ExploreUser[];
  }, [supabase]);

  /** -------- Load trending hashtags -------- */
  const loadTrending = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_trending_hashtags", {
      days_back: 7,
      limit_n: 12,
    });

    if (error) {
      logErr("Explore get_trending_hashtags error:", error);
      return [];
    }

    return (data || []).map((t: any) => ({
      tag: String(t.tag || "").trim(),
      uses: Number(t.uses || 0),
    })) as TrendingTag[];
  }, [supabase]);

  /** -------- INITIAL LOAD -------- */
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      if (!me?.id) return;

      setLoading(true);

      const [following, interests, sugg, trendingTags, all] = await Promise.all([
        loadFollowing(me.id),
        loadMyInterests(me.id),
        loadSuggested(me.id),
        loadTrending(),
        loadAllUsers(),
      ]);

      if (!mounted) return;

      setFollowingMap(following);
      setMyInterests(interests);
      setSuggested(sugg.filter((u) => u.id !== me.id));
      setTrending(trendingTags);
      setAllUsers(all.filter((u) => u.id !== me.id));
      setLoading(false);
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, [me?.id, loadFollowing, loadMyInterests, loadSuggested, loadTrending, loadAllUsers]);

  /** -------- REALTIME: follows updates -------- */
  useEffect(() => {
    if (!me?.id) return;

    const ch = supabase
      .channel(`realtime-follows-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, (payload) => {
        const rowNew = payload.new as any;
        const rowOld = payload.old as any;

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
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, me?.id]);

  /** -------- DM CONNECT -------- */
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

    router.push(`/messages/${data}`);
  };

  /** -------- Follow / Unfollow -------- */
  const follow = async (userId: string) => {
    if (!me?.id) return;
    setBusyId(userId);

    const { error } = await supabase.from("follows").insert({
      follower_id: me.id,
      following_id: userId,
    });

    setBusyId(null);

    if (error) {
      logErr("Follow error:", error);
      return;
    }
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

    setBusyId(null);

    if (error) {
      logErr("Unfollow error:", error);
      return;
    }
    // realtime will update map
  };

  /** -------- Data source based on tab -------- */
  const baseList: ExploreUser[] = (() => {
    if (tab === "suggested") return suggested;
    if (tab === "popular") return [...suggested].sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
    if (tab === "new") return [...suggested].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
    return allUsers;
  })();

  /** -------- Filters: search + interest filter + hashtag filter (optional) --------
   * We filter by:
   *  - Search: name/username
   *  - interestFilter: match shared interest count > 0 OR username/name includes interest term
   *  - tagFilter: since tags are post-level, we use it as "topic intent" and boost suggested list (simple filter)
   */
  const filteredUsers = baseList.filter((u) => {
    const name = `${u.full_name || ""} ${u.username || ""}`.trim().toLowerCase();
    const q = search.trim().toLowerCase();
    if (q && !name.includes(q)) return false;

    const interestQ = interestFilter.trim().toLowerCase();
    if (interestQ) {
      // If user has shared_interests > 0, keep; else allow text match too
      const textMatch = name.includes(interestQ);
      if (!textMatch && (u.shared_interests || 0) <= 0) return false;
    }

    const tagQ = tagFilter.trim().toLowerCase();
    if (tagQ) {
      // we don't have per-user hashtag data here, so we treat it as "suggested only"
      // keep only users with some signal (mutuals/shared interests/active) when a tag is selected
      const signal = (u.mutual_count || 0) + (u.shared_interests || 0) + (isActiveThisWeek(u.last_active_at) ? 1 : 0);
      if (signal <= 0) return false;
    }

    return true;
  });

  /** -------- UI -------- */

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 border">
          <p className="text-center text-gray-500">Loading Explore…</p>
        </div>
      </div>
    );
  }

  const TabBtn = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(k)}
      className={
        "px-4 py-2 text-sm rounded-xl border transition " +
        (tab === k ? "bg-purple-600 text-white border-purple-600" : "bg-white hover:bg-gray-50")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
              <p className="text-sm text-gray-600 mt-1">
                Suggested people, mutual connections, interests, and trending topics.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/mood-feed")}
              className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-50"
            >
              Back to Feed
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            <TabBtn k="suggested" label="Suggested for you" />
            <TabBtn k="popular" label="Popular" />
            <TabBtn k="new" label="New users" />
            <TabBtn k="all" label="All" />
          </div>

          {/* Search + Interest Filter */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="Search by name or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <input
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="Filter by interest (e.g., fitness, coding)…"
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
            />
          </div>

          {/* My interests quick chips */}
          {myInterests.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Your interests:</p>
              <div className="flex flex-wrap gap-2">
                {myInterests.slice(0, 12).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInterestFilter(i)}
                    className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50"
                  >
                    {i}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setInterestFilter("")}
                  className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trending hashtags */}
        <div className="bg-white rounded-2xl border p-5 mb-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">Trending Topics</h2>
            {tagFilter ? (
              <button
                type="button"
                onClick={() => setTagFilter("")}
                className="text-xs px-3 py-1 rounded-full border hover:bg-gray-50"
              >
                Clear topic
              </button>
            ) : (
              <span className="text-xs text-gray-500">Last 7 days</span>
            )}
          </div>

          {trending.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">No trending topics yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-3">
              {trending.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => setTagFilter(t.tag)}
                  className={
                    "text-xs px-3 py-1 rounded-full border transition " +
                    (tagFilter === t.tag ? "bg-purple-600 text-white border-purple-600" : "bg-white hover:bg-gray-50")
                  }
                  title={`${t.uses} posts`}
                >
                  #{t.tag} <span className="opacity-70">({t.uses})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">
            No users found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const displayName = safeName(u);
              const handle = u.username ? `@${u.username}` : null;
              const isFollowing = !!followingMap[u.id];
              const isBusy = busyId === u.id;

              const newBadge = isNewUser(u.created_at);
              const activeBadge = isActiveThisWeek(u.last_active_at);
              const friendsBadge = (u.mutual_count || 0) > 0;

              const url = avatarUrl(u.avatar_path);

              return (
                <div
                  key={u.id}
                  className="bg-white border rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  {/* Left */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    {url ? (
                      <img
                        src={url}
                        alt={displayName}
                        className="w-11 h-11 rounded-full object-cover border shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 shrink-0">
                        {(displayName || "U").slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    {/* Names + badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate max-w-[240px]">
                          {displayName}
                        </p>

                        {isFollowing && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                            Following
                          </span>
                        )}

                        {newBadge && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            New
                          </span>
                        )}

                        {activeBadge && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                            Active this week
                          </span>
                        )}

                        {friendsBadge && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            {u.mutual_count} friends in common
                          </span>
                        )}
                      </div>

                      {handle && <p className="text-sm text-gray-500 truncate">{handle}</p>}

                      {/* Signals row */}
                      <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                        {u.follower_count > 0 && <span>{u.follower_count} followers</span>}
                        {u.shared_interests > 0 && <span>{u.shared_interests} shared interests</span>}
                      </div>
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
          Tip: Use interests + trending topics to find people you’ll vibe with on FeelUp.
        </div>
      </div>
    </div>
  );
}
