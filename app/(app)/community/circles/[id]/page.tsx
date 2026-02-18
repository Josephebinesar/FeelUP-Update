"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  Users,
  Lock,
  Globe,
  UserPlus,
  LogOut,
  ChevronRight,
  Sparkles,
  Shield,
} from "lucide-react";

type Circle = {
  id: string;
  name: string;
  description: string | null;
  visibility: string | null; // "public" | "followers" | "circle"
  owner_id: string;
  created_at: string;
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

function cx(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

function visMeta(v?: string | null) {
  if (v === "circle")
    return { icon: <Lock className="w-4 h-4" />, label: "Invite-only" };
  if (v === "followers")
    return { icon: <Users className="w-4 h-4" />, label: "Followers" };
  return { icon: <Globe className="w-4 h-4" />, label: "Public" };
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
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
      <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-purple-400/40 via-pink-400/30 to-blue-400/40 blur-xl opacity-70" />
      <div className="relative rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
        {children}
      </div>
    </div>
  );
}

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [circle, setCircle] = useState<Circle | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);

  const [memberCount, setMemberCount] = useState<number>(0);
  const [myRole, setMyRole] = useState<string | null>(null); // "admin" | "member" | null
  const isMember = !!myRole;
  const isAdmin = myRole === "admin";

  const [actionBusy, setActionBusy] = useState(false);
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

  /* ---------------- LOAD CIRCLE ---------------- */

  const loadCircle = useCallback(async () => {
    if (!id) return;

    const res = await supabase
      .from("community_circles")
      .select("id, name, description, visibility, owner_id, created_at")
      .eq("id", id)
      .single();

    if (res.error) {
      showToast("Failed to load circle: " + safeMsg(res.error));
      setCircle(null);
      return;
    }

    setCircle(res.data as any);

    const ownerRes = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", res.data.owner_id)
      .maybeSingle();

    if (!ownerRes.error) {
      setOwner((ownerRes.data as any) || null);
    }
  }, [id, supabase]);

  const loadMemberCount = useCallback(async () => {
    if (!id) return;

    const { count } = await supabase
      .from("circle_members")
      .select("*", { count: "exact", head: true })
      .eq("circle_id", id);

    setMemberCount(count || 0);
  }, [id, supabase]);

  const loadMyRole = useCallback(async () => {
    if (!id || !me?.id) return;

    const res = await supabase
      .from("circle_members")
      .select("role")
      .eq("circle_id", id)
      .eq("user_id", me.id)
      .maybeSingle();

    if (res.error) {
      setMyRole(null);
      return;
    }

    setMyRole((res.data as any)?.role ?? null);
  }, [id, me?.id, supabase]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadCircle(), loadMemberCount(), loadMyRole()]);
  }, [loadCircle, loadMemberCount, loadMyRole]);

  useEffect(() => {
    if (!me) return;
    loadAll();
  }, [me, loadAll]);

  /* ---------------- JOIN / LEAVE ---------------- */

  const joinCircle = async () => {
    if (!me?.id || !circle?.id) return;

    if (circle.visibility === "followers") {
      showToast("Followers-only (invite/follow logic coming next).");
      return;
    }
    if (circle.visibility === "circle") {
      showToast("Invite-only. Ask an admin to invite you.");
      return;
    }

    setActionBusy(true);

    const ins = await supabase.from("circle_members").insert({
      circle_id: circle.id,
      user_id: me.id,
      role: "member",
    });

    setActionBusy(false);

    if (ins.error) {
      const msg = safeMsg(ins.error).toLowerCase();
      // safe if unique constraint exists; treat duplicates as success
      if (msg.includes("duplicate") || msg.includes("unique")) {
        await loadMemberCount();
        await loadMyRole();
        showToast("Already a member ✅");
        return;
      }
      showToast("Join failed: " + safeMsg(ins.error));
      return;
    }

    await loadMemberCount();
    await loadMyRole();
    showToast("Joined ✅");
  };

  const leaveCircle = async () => {
    if (!me?.id || !circle?.id) return;

    if (myRole === "admin") {
      showToast("Admins can’t leave. Transfer admin first.");
      return;
    }

    if (!confirm("Leave this circle?")) return;

    setActionBusy(true);

    const del = await supabase
      .from("circle_members")
      .delete()
      .eq("circle_id", circle.id)
      .eq("user_id", me.id);

    setActionBusy(false);

    if (del.error) {
      showToast("Leave failed: " + safeMsg(del.error));
      return;
    }

    await loadMemberCount();
    await loadMyRole();
    showToast("Left circle ✅");
  };

  /* ---------------- REALTIME (FILTERED) ---------------- */

  useEffect(() => {
    if (!id) return;

    const ch = supabase
      .channel(`circle-${id}-realtime`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circle_members",
          filter: `circle_id=eq.${id}`,
        },
        () => {
          loadMemberCount();
          loadMyRole();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_circles",
          filter: `id=eq.${id}`,
        },
        () => loadCircle()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, supabase, loadMemberCount, loadMyRole, loadCircle]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <GlassShell>
        <div className="text-center text-gray-700">Loading…</div>
      </GlassShell>
    );
  }

  if (!circle) {
    return (
      <GlassShell>
        <div className="text-center text-gray-700">Circle not found.</div>
      </GlassShell>
    );
  }

  const vis = visMeta(circle.visibility);

  return (
    <GlassShell>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold text-purple-800 hover:underline"
          type="button"
        >
          ← Back
        </button>

        <Link
          href={`/community/circles/${circle.id}/members`}
          className="text-sm font-semibold text-purple-800 inline-flex items-center gap-1 hover:underline"
        >
          Members <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <Card3D>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-700" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 truncate">
                  {circle.name}
                </h1>
              </div>

              <p className="text-sm text-gray-700 mt-3 max-w-2xl">
                {circle.description || "A trusted space for sharing moods and reflections."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-white/60 backdrop-blur text-gray-800 shadow-sm">
                  {vis.icon} <b>{vis.label}</b>
                </span>

                <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-white/60 backdrop-blur text-gray-800 shadow-sm">
                  <Users className="w-4 h-4" /> <b>{memberCount}</b> members
                </span>

                {owner && (
                  <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-white/60 backdrop-blur text-gray-800 shadow-sm">
                    Owner: <b>{owner.full_name || owner.username || "User"}</b>
                  </span>
                )}

                {myRole && (
                  <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-purple-50 text-purple-900 border-purple-200 shadow-sm">
                    {isAdmin ? <Shield className="w-4 h-4" /> : null}
                    Your role: <b>{myRole}</b>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {!isMember ? (
              <button
                onClick={joinCircle}
                disabled={actionBusy}
                className={cx(
                  "sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl",
                  "bg-gradient-to-r from-purple-700 via-fuchsia-700 to-indigo-700 text-white",
                  "shadow-[0_16px_50px_-20px_rgba(88,28,135,0.6)]",
                  "hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
                )}
                type="button"
              >
                <UserPlus className="w-4 h-4" />
                Join Circle
              </button>
            ) : (
              <button
                onClick={leaveCircle}
                disabled={actionBusy}
                className={cx(
                  "sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl",
                  "border bg-white/70 backdrop-blur hover:bg-white",
                  "shadow-[0_16px_45px_-25px_rgba(0,0,0,0.35)]",
                  "active:scale-[0.99] transition disabled:opacity-50"
                )}
                type="button"
              >
                <LogOut className="w-4 h-4" />
                Leave Circle
              </button>
            )}

            <button
              onClick={() => router.push(`/community/circles/${circle.id}/members`)}
              className={cx(
                "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl",
                "border bg-white/70 backdrop-blur hover:bg-white",
                "shadow-[0_16px_45px_-25px_rgba(0,0,0,0.35)]",
                "active:scale-[0.99] transition"
              )}
              type="button"
            >
              <Users className="w-4 h-4" />
              View Members
            </button>
          </div>

          {/* Placeholder section */}
          <div className="mt-8 border-t border-white/60 pt-6">
            <h2 className="font-extrabold text-gray-900 mb-2">
              Circle Posts (coming next)
            </h2>
            <p className="text-sm text-gray-700">
              Next step: show mood posts visible only to this circle ✅
            </p>
          </div>
        </div>
      </Card3D>
    </GlassShell>
  );
}
