"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Shield, User, Trash2, ChevronLeft } from "lucide-react";

type MemberRow = {
  user_id: string;
  role: "admin" | "member" | string;
  created_at?: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

function safeMsg(err: any) {
  return (
    (typeof err?.message === "string" && err.message) ||
    (typeof err === "string" && err) ||
    "Unknown error"
  );
}

export default function CircleMembersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<(MemberRow & { profile?: Profile | null })[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const isAdmin = myRole === "admin";

  const [busyId, setBusyId] = useState<string | null>(null);

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setMe(data.user);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* ---------------- LOAD MEMBERS ---------------- */

  const loadMyRole = useCallback(async () => {
    if (!me?.id || !id) return;

    const res = await supabase
      .from("circle_members")
      .select("role")
      .eq("circle_id", id)
      .eq("user_id", me.id)
      .maybeSingle();

    setMyRole((res.data as any)?.role ?? null);
  }, [id, me?.id, supabase]);

  const loadMembers = useCallback(async () => {
    if (!id) return;

    const res = await supabase
      .from("circle_members")
      .select("user_id, role, created_at")
      .eq("circle_id", id)
      .order("created_at", { ascending: true });

    if (res.error) {
      alert("Failed to load members: " + safeMsg(res.error));
      setMembers([]);
      return;
    }

    const list = (res.data || []) as MemberRow[];
    const ids = Array.from(new Set(list.map((m) => m.user_id)));

    let profilesById: Record<string, Profile> = {};
    if (ids.length) {
      const pRes = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", ids);

      if (!pRes.error) {
        (pRes.data || []).forEach((p: any) => {
          profilesById[p.id] = p;
        });
      }
    }

    setMembers(
      list.map((m) => ({
        ...m,
        profile: profilesById[m.user_id] || null,
      }))
    );
  }, [id, supabase]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMyRole(), loadMembers()]);
  }, [loadMyRole, loadMembers]);

  useEffect(() => {
    if (!me) return;
    loadAll();
  }, [me, loadAll]);

  /* ---------------- ACTIONS (ADMIN) ---------------- */

  const setRole = async (userId: string, role: "admin" | "member") => {
    if (!isAdmin) return;

    setBusyId(userId);

    const upd = await supabase
      .from("circle_members")
      .update({ role })
      .eq("circle_id", id)
      .eq("user_id", userId);

    setBusyId(null);

    if (upd.error) {
      alert("Failed to update role: " + safeMsg(upd.error));
      return;
    }

    loadAll();
  };

  const removeMember = async (userId: string) => {
    if (!isAdmin) return;

    if (userId === me?.id) {
      alert("You can’t remove yourself. Transfer admin first.");
      return;
    }

    if (!confirm("Remove this member from the circle?")) return;

    setBusyId(userId);

    const del = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", id)
      .eq("user_id", userId);

    setBusyId(null);

    if (del.error) {
      alert("Failed to remove member: " + safeMsg(del.error));
      return;
    }

    loadAll();
  };

  /* ---------------- REALTIME ---------------- */

  useEffect(() => {
    if (!id) return;

    const ch = supabase
      .channel(`circle-members-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "circle_members" }, () => loadAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, supabase, loadAll]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:underline"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <Link
            href={`/community/circles/${id}`}
            className="text-sm font-semibold text-purple-700 hover:underline"
          >
            Circle details
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Members</h1>
              <p className="text-sm text-gray-600 mt-1">
                {isAdmin ? "You can manage roles and remove members." : "You can view members in this circle."}
              </p>
            </div>

            {myRole && (
              <span className="text-xs px-3 py-1 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
                Your role: {myRole}
              </span>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {members.length === 0 ? (
              <div className="text-sm text-gray-500">No members found.</div>
            ) : (
              members.map((m) => {
                const p = m.profile;
                const name = p?.full_name || p?.username || "User";
                const username = p?.username ? `@${p.username}` : "";

                return (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between gap-3 border rounded-xl p-4"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{name}</div>
                      <div className="text-xs text-gray-500 truncate">{username || m.user_id}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role badge */}
                      <span
                        className={`text-xs px-3 py-1 rounded-full border inline-flex items-center gap-1 ${
                          m.role === "admin"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {m.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {m.role}
                      </span>

                      {/* Admin controls */}
                      {isAdmin && (
                        <>
                          {m.role !== "admin" ? (
                            <button
                              disabled={busyId === m.user_id}
                              onClick={() => setRole(m.user_id, "admin")}
                              className="text-xs px-3 py-1 rounded-full border hover:bg-gray-50 disabled:opacity-50"
                              type="button"
                            >
                              Make admin
                            </button>
                          ) : m.user_id !== me?.id ? (
                            <button
                              disabled={busyId === m.user_id}
                              onClick={() => setRole(m.user_id, "member")}
                              className="text-xs px-3 py-1 rounded-full border hover:bg-gray-50 disabled:opacity-50"
                              type="button"
                            >
                              Make member
                            </button>
                          ) : null}

                          {m.user_id !== me?.id && (
                            <button
                              disabled={busyId === m.user_id}
                              onClick={() => removeMember(m.user_id)}
                              className="text-xs px-3 py-1 rounded-full border text-red-600 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1"
                              type="button"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Note */}
          {!myRole && (
            <div className="mt-5 text-sm text-red-600">
              You are not a member of this circle.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
