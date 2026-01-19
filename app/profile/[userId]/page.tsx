"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  /* ---------------- LOAD AUTH USER ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user ?? null);
    });
  }, [supabase]);

  /* ---------------- LOAD PROFILE ---------------- */

  useEffect(() => {
    if (!userId) return;

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, is_private")
        .eq("id", userId)
        .single();

      if (error || !data) {
        router.replace("/explore");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, [userId, supabase, router]);

  /* ---------------- LOAD FOLLOW / REQUEST DATA ---------------- */

  useEffect(() => {
    if (!currentUser || !profile) return;

    async function loadFollowState() {
      // Followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);

      // Following count
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id);

      setFollowers(followersCount || 0);
      setFollowing(followingCount || 0);

      // Follow status
      const { data: follow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id)
        .maybeSingle();

      setIsFollowing(!!follow);

      // Mutual
      const { data: followsMe } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", profile.id)
        .eq("following_id", currentUser.id)
        .maybeSingle();

      setIsMutual(!!follow && !!followsMe);

      // Request sent?
      const { data: request } = await supabase
        .from("follow_requests")
        .select("id")
        .eq("requester_id", currentUser.id)
        .eq("target_id", profile.id)
        .maybeSingle();

      setRequestSent(!!request);
    }

    loadFollowState();
  }, [currentUser, profile, supabase]);

  /* ---------------- FOLLOW ACTION ---------------- */

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    if (currentUser.id === profile.id) return;

    // 🔐 PRIVATE PROFILE → REQUEST
    if (profile.is_private) {
      await supabase.from("follow_requests").insert({
        requester_id: currentUser.id,
        target_id: profile.id,
      });

      await supabase.from("notifications").insert({
        user_id: profile.id,
        actor_id: currentUser.id,
        type: "follow_request",
      });

      setRequestSent(true);
      return;
    }

    // 🌍 PUBLIC PROFILE → FOLLOW
    await supabase.from("follows").insert({
      follower_id: currentUser.id,
      following_id: profile.id,
    });

    setIsFollowing(true);
    setFollowers((f) => f + 1);
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div className="p-10 text-center">Loading profile...</div>;
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <h1 className="text-2xl font-bold">
          {profile.full_name || profile.username}
        </h1>

        <p className="text-gray-500">@{profile.username}</p>

        {profile.bio && (
          <p className="mt-4 text-gray-700">{profile.bio}</p>
        )}

        {/* FOLLOW STATS */}
        <div className="flex justify-center gap-8 mt-6 text-sm">
          <div>
            <b>{followers}</b>
            <div className="text-gray-500">Followers</div>
          </div>
          <div>
            <b>{following}</b>
            <div className="text-gray-500">Following</div>
          </div>
        </div>

        {/* MUTUAL */}
        {!isOwnProfile && isMutual && (
          <p className="mt-2 text-xs text-green-600">
            🔄 You follow each other
          </p>
        )}

        {/* FOLLOW BUTTON */}
        {!isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={isFollowing || requestSent}
            className={`mt-6 w-full py-2 rounded-lg font-medium transition ${
              isFollowing
                ? "bg-gray-200 text-gray-700"
                : requestSent
                ? "bg-gray-100 text-gray-500"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isFollowing
              ? "Following"
              : requestSent
              ? "Request Sent"
              : profile.is_private
              ? "Request to Follow"
              : "Follow"}
          </button>
        )}
      </div>
    </div>
  );
}
