"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type Community = {
  id: string;
  name: string;
  description: string | null;
};

type Goal = {
  id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  done: boolean;
};

export default function RightSidebar({ userEmail }: { userEmail?: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<{ id: string } | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedSet, setJoinedSet] = useState<Set<string>>(new Set());

  const [todayGoals, setTodayGoals] = useState<Goal[]>([]);

  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);

  const todayISO = useMemo(() => {
    // local date YYYY-MM-DD
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const avatarLetter = (p: Profile) => {
    const s = (p.full_name || p.username || "U").trim();
    return (s[0] || "U").toUpperCase();
  };

  const safeName = (p: Profile) =>
    (p.full_name || p.username || "Unnamed user").trim();

  /* ---------------- AUTH (get my id) ---------------- */

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data?.user?.id) setMe({ id: data.user.id });
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* ---------------- LOAD: PROFILES + FOLLOWING ---------------- */

  const loadSuggestedProfiles = useCallback(async () => {
    setLoadingProfiles(true);

    // last created profiles
    const res = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .order("created_at", { ascending: false })
      .limit(8);

    if (!res.error && res.data) {
      // don't show self
      const list = me?.id ? res.data.filter((p) => p.id !== me.id) : res.data;
      setProfiles(list.slice(0, 5));
    }

    setLoadingProfiles(false);
  }, [supabase, me?.id]);

  const loadMyFollowing = useCallback(async () => {
    if (!me?.id) return;

    const res = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", me.id);

    if (!res.error) {
      const s = new Set<string>((res.data || []).map((r: any) => r.following_id));
      setFollowingSet(s);
    }
  }, [supabase, me?.id]);

  /* ---------------- LOAD: COMMUNITIES + JOINED ---------------- */

  const loadSuggestedCommunities = useCallback(async () => {
    setLoadingCommunities(true);

    const res = await supabase
      .from("communities")
      .select("id, name, description")
      .order("created_at", { ascending: false })
      .limit(6);

    if (!res.error && res.data) {
      setCommunities(res.data.slice(0, 3));
    }

    setLoadingCommunities(false);
  }, [supabase]);

  const loadMyMemberships = useCallback(async () => {
    if (!me?.id) return;

    const res = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", me.id);

    if (!res.error) {
      const s = new Set<string>((res.data || []).map((r: any) => r.community_id));
      setJoinedSet(s);
    }
  }, [supabase, me?.id]);

  /* ---------------- LOAD: TODAY GOALS ---------------- */

  const loadTodayGoals = useCallback(async () => {
    if (!me?.id) return;
    setLoadingGoals(true);

    const res = await supabase
      .from("goals")
      .select("id, title, due_date, done")
      .eq("user_id", me.id)
      .eq("due_date", todayISO)
      .order("created_at", { ascending: false });

    if (!res.error) {
      setTodayGoals((res.data as any) || []);
    }

    setLoadingGoals(false);
  }, [supabase, me?.id, todayISO]);

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    loadSuggestedProfiles();
    loadSuggestedCommunities();
  }, [loadSuggestedProfiles, loadSuggestedCommunities]);

  useEffect(() => {
    if (!me?.id) return;
    loadMyFollowing();
    loadMyMemberships();
    loadTodayGoals();
  }, [me?.id, loadMyFollowing, loadMyMemberships, loadTodayGoals]);

  /* ---------------- REALTIME ---------------- */

  useEffect(() => {
    // profiles updates -> refresh suggestions
    const profilesChannel = supabase
      .channel("rt-profiles-sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadSuggestedProfiles();
      })
      .subscribe();

    // follows updates -> refresh following set
    const followsChannel = supabase
      .channel("rt-follows-sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, (payload) => {
        // if my follow/unfollow changed, reload set
        const row: any = payload.new || payload.old;
        if (me?.id && (row?.follower_id === me.id)) loadMyFollowing();
      })
      .subscribe();

    // communities updates -> refresh suggestions
    const communitiesChannel = supabase
      .channel("rt-communities-sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "communities" }, () => {
        loadSuggestedCommunities();
      })
      .subscribe();

    // community_members updates -> refresh my joined set
    const membersChannel = supabase
      .channel("rt-community-members-sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_members" }, (payload) => {
        const row: any = payload.new || payload.old;
        if (me?.id && row?.user_id === me.id) loadMyMemberships();
      })
      .subscribe();

    // goals updates -> refresh today's goals
    const goalsChannel = supabase
      .channel("rt-goals-sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, (payload) => {
        const row: any = payload.new || payload.old;
        if (me?.id && row?.user_id === me.id) loadTodayGoals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(communitiesChannel);
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(goalsChannel);
    };
  }, [
    supabase,
    me?.id,
    loadSuggestedProfiles,
    loadMyFollowing,
    loadSuggestedCommunities,
    loadMyMemberships,
    loadTodayGoals,
  ]);

  /* ---------------- ACTIONS ---------------- */

  const toggleFollow = async (profileId: string) => {
    if (!me?.id) return;

    const isFollowing = followingSet.has(profileId);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", me.id)
        .eq("following_id", profileId);
    } else {
      await supabase.from("follows").insert({
        follower_id: me.id,
        following_id: profileId,
      });
    }

    // optimistic refresh
    loadMyFollowing();
  };

  const toggleJoin = async (communityId: string) => {
    if (!me?.id) return;

    const joined = joinedSet.has(communityId);

    if (joined) {
      await supabase
        .from("community_members")
        .delete()
        .eq("user_id", me.id)
        .eq("community_id", communityId);
    } else {
      await supabase.from("community_members").insert({
        user_id: me.id,
        community_id: communityId,
      });
    }

    loadMyMemberships();
  };

  const toggleGoalDone = async (goalId: string, nextDone: boolean) => {
    if (!me?.id) return;

    await supabase
      .from("goals")
      .update({ done: nextDone })
      .eq("id", goalId)
      .eq("user_id", me.id);

    loadTodayGoals();
  };

  /* ---------------- UI ---------------- */

  return (
    <aside className="hidden lg:block space-y-4">
      {/* Suggested profiles */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Suggested profiles</h3>
          <Link href="/explore" className="text-xs text-blue-600 hover:underline">
            See all
          </Link>
        </div>

        {loadingProfiles ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-gray-400">No users found</p>
        ) : (
          <ul className="space-y-3">
            {profiles.map((p) => {
              const isFollowing = followingSet.has(p.id);
              return (
                <li key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                      {avatarLetter(p)}
                    </div>

                    <div className="leading-tight">
                      <Link href={`/profile/${p.id}`} className="text-sm font-medium hover:underline">
                        {safeName(p)}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {p.username ? `@${p.username}` : userEmail ? userEmail : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleFollow(p.id)}
                    className="text-xs text-blue-600 hover:underline"
                    type="button"
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Suggested communities */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Suggested communities</h3>
          <Link href="/communities" className="text-xs text-blue-600 hover:underline">
            Browse
          </Link>
        </div>

        {loadingCommunities ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : communities.length === 0 ? (
          <p className="text-sm text-gray-400">No communities yet</p>
        ) : (
          <ul className="space-y-3">
            {communities.map((c) => {
              const joined = joinedSet.has(c.id);
              return (
                <li key={c.id} className="flex items-center justify-between">
                  <div className="leading-tight">
                    <Link href={`/communities/${c.id}`} className="text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
                  </div>

                  <button
                    onClick={() => toggleJoin(c.id)}
                    className="text-xs text-blue-600 hover:underline"
                    type="button"
                  >
                    {joined ? "Joined" : "Join"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Today's goals */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Today&apos;s goals</h3>
          <Link href="/goals" className="text-xs text-blue-600 hover:underline">
            Add one
          </Link>
        </div>

        {loadingGoals ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : todayGoals.length === 0 ? (
          <p className="text-sm text-gray-400">
            No pending goals for today —{" "}
            <Link href="/goals" className="text-blue-600 hover:underline">
              add one!
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {todayGoals.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={g.done}
                    onChange={(e) => toggleGoalDone(g.id, e.target.checked)}
                  />
                  <span className={g.done ? "line-through text-gray-400" : ""}>{g.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
