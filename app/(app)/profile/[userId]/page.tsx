"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { User, Users, UserPlus, UserCheck, Lock, ArrowLeft } from "lucide-react";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  is_private: boolean | null;
};

export default function ProfileByIdPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const isOwnProfile = me?.id && profile?.id && me.id === profile.id;

  const logErr = (label: string, err: any) => {
    const msg = err?.message || "Unknown error";
    const code = err?.code ? `[${err.code}] ` : "";
    console.error(`${label} ${code}${msg}`);
  };

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) logErr("AUTH getUser:", error);
      setMe(data.user ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* ---------------- LOAD PROFILE ---------------- */

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, is_private")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        router.replace("/explore");
        return;
      }

      setProfile(data);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [userId, supabase, router]);

  /* ---------------- LOAD FOLLOW STATE ---------------- */

  const loadFollowState = useCallback(async () => {
    if (!me || !profile) return;

    // followers count
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id);

    // following count
    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id);

    setFollowers(followersCount || 0);
    setFollowing(followingCount || 0);

    // am I following them?
    const { data: followRow, error: followErr } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", me.id)
      .eq("following_id", profile.id)
      .maybeSingle();

    if (followErr) logErr("FOLLOW check:", followErr);
    setIsFollowing(!!followRow);

    // do they follow me? (mutual)
    const { data: followsMe, error: mutualErr } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", profile.id)
      .eq("following_id", me.id)
      .maybeSingle();

    if (mutualErr) logErr("MUTUAL check:", mutualErr);
    setIsMutual(!!followRow && !!followsMe);

    // request sent?
    const { data: req, error: reqErr } = await supabase
      .from("follow_requests")
      .select("id")
      .eq("requester_id", me.id)
      .eq("target_id", profile.id)
      .maybeSingle();

    if (reqErr) logErr("REQUEST check:", reqErr);
    setRequestSent(!!req);
  }, [me, profile, supabase]);

  useEffect(() => {
    loadFollowState();
  }, [loadFollowState]);

  /* ---------------- FOLLOW / UNFOLLOW ---------------- */

  const handleFollow = async () => {
    if (!me || !profile || isOwnProfile) return;

    // Private profile: send request
    if (profile.is_private) {
      const ins = await supabase.from("follow_requests").insert({
        requester_id: me.id,
        target_id: profile.id,
      });

      if (ins.error) {
        alert(ins.error.message || "Failed to request follow");
        logErr("REQUEST insert:", ins.error);
        return;
      }

      setRequestSent(true);
      return;
    }

    // Public: follow
    const ins = await supabase.from("follows").insert({
      follower_id: me.id,
      following_id: profile.id,
    });

    if (ins.error) {
      alert(ins.error.message || "Failed to follow");
      logErr("FOLLOW insert:", ins.error);
      return;
    }

    await loadFollowState();
  };

  const handleUnfollow = async () => {
    if (!me || !profile || isOwnProfile) return;

    const del = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", me.id)
      .eq("following_id", profile.id);

    if (del.error) {
      alert(del.error.message || "Failed to unfollow");
      logErr("UNFOLLOW:", del.error);
      return;
    }

    await loadFollowState();
  };

  /* ---------------- REALTIME COUNTS ---------------- */

  useEffect(() => {
    if (!profile) return;

    const ch = supabase
      .channel(`rt-profile-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;

          const affectedId =
            newRow?.following_id ||
            oldRow?.following_id ||
            newRow?.follower_id ||
            oldRow?.follower_id;

          if (affectedId === profile.id) loadFollowState();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_requests" },
        (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;
          if (
            newRow?.target_id === profile.id ||
            oldRow?.target_id === profile.id ||
            newRow?.requester_id === profile.id ||
            oldRow?.requester_id === profile.id
          ) {
            loadFollowState();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, profile, loadFollowState]);

  /* ---------------- UI ---------------- */

  if (loading) return <div className="p-10 text-center text-gray-500">Loading profile…</div>;
  if (!profile) return <div className="p-10 text-center text-red-500">Profile not found</div>;

  const displayName = profile.full_name || profile.username || "User";
  const handle = profile.username ? `@${profile.username}` : "@user";
  const initials = (displayName || "U")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100"
            type="button"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center text-2xl font-bold">
              {initials || <User className="w-8 h-8" />}
            </div>

            {/* Name + actions */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                {profile.is_private && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    <Lock className="w-3 h-3" /> Private
                  </span>
                )}
                {!isOwnProfile && isMutual && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
                    🔄 Mutual
                  </span>
                )}
              </div>

              <p className="text-gray-500">{handle}</p>

              {profile.bio && (
                <p className="mt-3 text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="mt-5 flex gap-6">
                <Stat label="Followers" value={followers} />
                <Stat label="Following" value={following} />
              </div>

              {/* Buttons */}
              {!isOwnProfile && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {isFollowing ? (
                    <button
                      onClick={handleUnfollow}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
                      type="button"
                    >
                      <UserCheck className="w-4 h-4" />
                      Following
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      disabled={requestSent}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${
                        requestSent
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                      type="button"
                    >
                      <UserPlus className="w-4 h-4" />
                      {requestSent
                        ? "Request Sent"
                        : profile.is_private
                        ? "Request to Follow"
                        : "Follow"}
                    </button>
                  )}

                  <button
                    onClick={() => router.push(`/messages/${profile.id}`)}
                    className="px-4 py-2 rounded-xl border hover:bg-gray-50 font-medium"
                    type="button"
                  >
                    Message
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Private note */}
          {!isOwnProfile && profile.is_private && !isFollowing && (
            <div className="mt-6 p-4 rounded-xl bg-yellow-50 text-yellow-800 text-sm">
              This account is private. You’ll see their posts after they accept your request.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-gray-400" />
      <div>
        <div className="font-semibold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
