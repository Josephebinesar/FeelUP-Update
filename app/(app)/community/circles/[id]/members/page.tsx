"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Shield, User, Trash2, ChevronLeft, Users } from "lucide-react";

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

/* ---------------- UI HELPERS ---------------- */

function cx(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

function GlassShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-pink-50 to-blue-100 px-4 py-10">
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  );
}

function Card3D({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* glow */}
      <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-purple-400/40 via-pink-400/30 to-blue-400/40 blur-xl opacity-70" />
      {/* card */}
      <div className="relative rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
        {children}
      </div>
    </div>
  );
}

function Toast({
  msg,
  onClose,
}: {
  msg: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="px-4 py-2 rounded-full bg-black text-white text-sm shadow-lg">
        {msg}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="border border-white/60 bg-white/60 backdrop-blur rounded-2xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-56 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-gray-200 rounded-full" />
          <div className="h-7 w-24 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function CircleMembersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<
    (MemberRow & { profile?: Profile | null })[]
  >([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const isAdmin = myRole === "admin";

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => setToast(m);

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
      showToast("Failed to load members: " + safeMsg(res.error));
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
      showToast("Failed to update role: " + safeMsg(upd.error));
      return;
    }

    showToast("Role updated ✅");
    loadAll();
  };

  const removeMember = async (userId: string) => {
    if (!isAdmin) return;

    if (userId === me?.id) {
      showToast("You can’t remove yourself. Transfer admin first.");
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
      showToast("Failed to remove member: " + safeMsg(del.error));
      return;
    }

    showToast("Member removed ✅");
    loadAll();
  };

  /* ---------------- REALTIME (FILTERED) ---------------- */

  useEffect(() => {
    if (!id) return;

    const ch = supabase
      .channel(`circle-members-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circle_members",
          filter: `circle_id=eq.${id}`,
        },
        () => loadAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, supabase, loadAll]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <GlassShell>
        <div className="text-center text-gray-700">Loading…</div>
      </GlassShell>
    );
  }

  return (
    <GlassShell>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-800 hover:underline"
          type="button"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <Link
          href={`/community/circles/${id}`}
          className="text-sm font-semibold text-purple-800 hover:underline"
        >
          Circle details
        </Link>
      </div>

      <Card3D>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-purple-900">
                <Users className="w-5 h-5" />
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Members
                </h1>
              </div>
              <p className="text-sm text-gray-700 mt-2">
                {isAdmin
                  ? "You can manage roles and remove members."
                  : "You can view members in this circle."}
              </p>
            </div>

            {myRole && (
              <span className="text-xs px-3 py-1 rounded-full border bg-purple-50 text-purple-900 border-purple-200 shadow-sm">
                Your role: <b>{myRole}</b>
              </span>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {!myRole ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                You are not a member of this circle.
              </div>
            ) : null}

            {members.length === 0 ? (
              <div className="rounded-2xl border bg-white/60 backdrop-blur p-6 text-center text-gray-700 shadow-sm">
                No members found.
              </div>
            ) : (
              members.map((m) => {
                const p = m.profile;
                const name = p?.full_name || p?.username || "User";
                const username = p?.username ? `@${p.username}` : "";

                return (
                  <div
                    key={m.user_id}
                    className={cx(
                      "group relative overflow-hidden rounded-2xl border border-white/70 bg-white/60 backdrop-blur",
                      "shadow-[0_14px_40px_-25px_rgba(0,0,0,0.35)]",
                      "transition-transform duration-300 hover:-translate-y-0.5"
                    )}
                    style={{
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* subtle shine */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-400/20 blur-2xl" />
                      <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-400/20 blur-2xl" />
                    </div>

                    <div className="relative p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">
                          {name}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {username || "—"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role badge */}
                        <span
                          className={cx(
                            "text-xs px-3 py-1 rounded-full border inline-flex items-center gap-1 shadow-sm",
                            m.role === "admin"
                              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                              : "bg-gray-50 text-gray-800 border-gray-200"
                          )}
                        >
                          {m.role === "admin" ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <b className="capitalize">{m.role}</b>
                        </span>

                        {/* Admin controls */}
                        {isAdmin && (
                          <>
                            {m.role !== "admin" ? (
                              <button
                                disabled={busyId === m.user_id}
                                onClick={() => setRole(m.user_id, "admin")}
                                className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                                type="button"
                              >
                                Make admin
                              </button>
                            ) : m.user_id !== me?.id ? (
                              <button
                                disabled={busyId === m.user_id}
                                onClick={() => setRole(m.user_id, "member")}
                                className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                                type="button"
                              >
                                Make member
                              </button>
                            ) : null}

                            {m.user_id !== me?.id && (
                              <button
                                disabled={busyId === m.user_id}
                                onClick={() => removeMember(m.user_id)}
                                className="text-xs px-3 py-1 rounded-full border text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
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
                  </div>
                );
              })
            )}

            {/* little skeleton when busy but list empty (optional) */}
            {members.length === 0 && myRole ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : null}
          </div>
        </div>
      </Card3D>
    </GlassShell>
  );
}
