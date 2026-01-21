"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Users, Lock, Globe, UserPlus, LogOut, ChevronRight } from "lucide-react";

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

function visMeta(v?: string | null) {
  if (v === "circle") return { icon: <Lock className="w-4 h-4" />, label: "Invite-only" };
  if (v === "followers") return { icon: <Users className="w-4 h-4" />, label: "Followers" };
  return { icon: <Globe className="w-4 h-4" />, label: "Public" };
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

  const [actionBusy, setActionBusy] = useState(false);

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
      alert("Failed to load circle: " + safeMsg(res.error));
      setCircle(null);
      return;
    }

    setCircle(res.data as any);

    // owner profile
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
      // If row not found, maybeSingle gives null data (no error)
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

    // Simple rule:
    // - public: allow join
    // - followers / circle: block here (invite flow will handle later)
    if (circle.visibility === "followers") {
      alert("This circle is followers-only. (Next: we’ll connect follow/invite logic.)");
      return;
    }
    if (circle.visibility === "circle") {
      alert("This circle is invite-only. Ask an admin to invite you.");
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
      alert("Join failed: " + safeMsg(ins.error));
      return;
    }

    await loadMemberCount();
    await loadMyRole();
  };

  const leaveCircle = async () => {
    if (!me?.id || !circle?.id) return;

    if (myRole === "admin") {
      alert("Admins can’t leave. Transfer admin role first (or delete the circle later).");
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
      alert("Leave failed: " + safeMsg(del.error));
      return;
    }

    await loadMemberCount();
    await loadMyRole();
  };

  /* ---------------- REALTIME ---------------- */

  useEffect(() => {
    if (!id) return;

    const ch = supabase
      .channel(`circle-${id}-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: "circle_members" }, () => {
        loadMemberCount();
        loadMyRole();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_circles" }, (p) => {
        const rowId = (p.new as any)?.id || (p.old as any)?.id;
        if (rowId === id) loadCircle();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, supabase, loadMemberCount, loadMyRole, loadCircle]);

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>;
  }

  if (!circle) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Circle not found.
      </div>
    );
  }

  const vis = visMeta(circle.visibility);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.back()}
            className="text-sm font-semibold text-purple-700 hover:underline"
            type="button"
          >
            ← Back
          </button>

          <Link
            href={`/community/circles/${circle.id}/members`}
            className="text-sm font-semibold text-purple-700 inline-flex items-center gap-1 hover:underline"
          >
            Members <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{circle.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {circle.description || "A trusted space for sharing moods and reflections."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-gray-50 text-gray-700">
                  {vis.icon} {vis.label}
                </span>

                <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-gray-50 text-gray-700">
                  <Users className="w-4 h-4" /> {memberCount} members
                </span>

                {owner && (
                  <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-gray-50 text-gray-700">
                    Owner: {owner.full_name || owner.username || "User"}
                  </span>
                )}

                {myRole && (
                  <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
                    Your role: {myRole}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            {!isMember ? (
              <button
                onClick={joinCircle}
                disabled={actionBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50"
                type="button"
              >
                <UserPlus className="w-4 h-4" />
                Join Circle
              </button>
            ) : (
              <button
                onClick={leaveCircle}
                disabled={actionBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50"
                type="button"
              >
                <LogOut className="w-4 h-4" />
                Leave Circle
              </button>
            )}

            <button
              onClick={() => router.push(`/community/circles/${circle.id}/members`)}
              className="sm:w-[200px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              type="button"
            >
              <Users className="w-4 h-4" />
              View Members
            </button>
          </div>

          {/* Placeholder section for circle posts */}
          <div className="mt-7 border-t pt-5">
            <h2 className="font-bold text-gray-900 mb-2">Circle Posts (coming next)</h2>
            <p className="text-sm text-gray-600">
              Next step: show mood posts visible only to this circle ✅
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
