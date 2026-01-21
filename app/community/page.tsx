// app/community/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import {
  Users,
  Sparkles,
  CalendarDays,
  Flame,
  Search,
  ChevronRight,
  Plus,
} from "lucide-react";

/**
 * COMMUNITY HUB PAGE
 * ✅ Shows: Circles, Challenges, Upcoming Events, Suggested People
 * ✅ Realtime: circles/members, challenges, events, follows
 * ✅ Safe if tables not created yet: shows graceful "Coming soon" instead of crashing
 *
 * Expected tables (based on your planned routes):
 * - community_circles
 * - circle_members
 * - challenges
 * - challenge_participants
 * - events (already exists)
 * - profiles (already exists)
 * - follows (already exists)
 */

type Tab = "overview" | "circles" | "challenges";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type Circle = {
  id: string;
  name: string;
  description: string | null;
  visibility: "public" | "followers" | "circle" | string;
  owner_id: string;
  created_at: string;
  members_count?: number;
};

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  visibility: "public" | "followers" | "circle" | string;
  created_at: string;
  participants_count?: number;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  is_virtual: boolean | null;
  category: string | null;
  visibility: string | null;
  created_at: string | null;
};

function safeErrMsg(err: any) {
  return (
    (typeof err?.message === "string" && err.message) ||
    (typeof err === "string" && err) ||
    "Unknown error"
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtTime(t?: string | null) {
  if (!t) return "";
  // t might be "14:30:00"
  const parts = t.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return t;
}

function badgeForVisibility(v?: string | null) {
  if (v === "followers") return { label: "Followers", className: "bg-blue-50 text-blue-700 border-blue-200" };
  if (v === "circle") return { label: "Circle", className: "bg-purple-50 text-purple-700 border-purple-200" };
  return { label: "Public", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export default function CommunityPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");

  const [circles, setCircles] = useState<Circle[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);

  const [circlesAvailable, setCirclesAvailable] = useState(true);
  const [challengesAvailable, setChallengesAvailable] = useState(true);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

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

  /* ---------------- LOADERS ---------------- */

  const loadSuggestedPeople = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    const res = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .order("created_at", { ascending: false })
      .limit(8);

    if (res.error) return;

    const list = (res.data || []).filter((p: any) => p.id !== uid);
    setSuggested(list);
  }, [supabase]);

  const loadEvents = useCallback(async () => {
    // upcoming events (next ~30)
    const res = await supabase
      .from("events")
      .select("id, title, description, event_date, event_time, location, is_virtual, category, visibility, created_at")
      .order("event_date", { ascending: true })
      .limit(12);

    if (res.error) return;
    setEvents(res.data || []);
  }, [supabase]);

  const loadCircles = useCallback(async () => {
    // If tables not created, show "Coming soon"
    const res = await supabase
      .from("community_circles")
      .select("id, name, description, visibility, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(12);

    if (res.error) {
      const msg = safeErrMsg(res.error);
      // common Postgres errors when table doesn't exist: "relation ... does not exist"
      if (msg.toLowerCase().includes("does not exist")) {
        setCirclesAvailable(false);
        setCircles([]);
        return;
      }
      // other errors still shouldn't crash
      setCirclesAvailable(true);
      setCircles([]);
      return;
    }

    setCirclesAvailable(true);
    setCircles((res.data || []) as any);
  }, [supabase]);

  const loadChallenges = useCallback(async () => {
    const res = await supabase
      .from("challenges")
      .select("id, title, description, starts_on, ends_on, visibility, created_at")
      .order("created_at", { ascending: false })
      .limit(12);

    if (res.error) {
      const msg = safeErrMsg(res.error);
      if (msg.toLowerCase().includes("does not exist")) {
        setChallengesAvailable(false);
        setChallenges([]);
        return;
      }
      setChallengesAvailable(true);
      setChallenges([]);
      return;
    }

    setChallengesAvailable(true);
    setChallenges((res.data || []) as any);
  }, [supabase]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadCircles(), loadChallenges(), loadEvents(), loadSuggestedPeople()]);
  }, [loadCircles, loadChallenges, loadEvents, loadSuggestedPeople]);

  useEffect(() => {
    if (!me) return;
    loadAll();
  }, [me, loadAll]);

  /* ---------------- REALTIME ---------------- */

  useEffect(() => {
    if (!me) return;

    const ch = supabase
      .channel("community-hub-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => loadEvents())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadSuggestedPeople())
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => loadSuggestedPeople())
      // These will only work if tables exist, otherwise they just won't receive events.
      .on("postgres_changes", { event: "*", schema: "public", table: "community_circles" }, () => loadCircles())
      .on("postgres_changes", { event: "*", schema: "public", table: "circle_members" }, () => loadCircles())
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => loadChallenges())
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_participants" }, () => loadChallenges())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, supabase, loadEvents, loadSuggestedPeople, loadCircles, loadChallenges]);

  /* ---------------- FILTERS ---------------- */

  const q = query.trim().toLowerCase();
  const filteredCircles = circles.filter((c) => {
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  const filteredChallenges = challenges.filter((c) => {
    if (!q) return true;
    return (c.title || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  const filteredEvents = events.filter((e) => {
    if (!q) return true;
    return (e.title || "").toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q);
  });

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading community…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-sm px-4 py-2 rounded-full shadow">
          {toast}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-700" />
              </div>
              <h1 className="text-4xl font-bold text-purple-900">Community</h1>
            </div>
            <p className="text-gray-700 max-w-2xl">
              Your hub for <b>Circles</b>, <b>Challenges</b>, and <b>Events</b> — built for safe, supportive growth.
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/explore"
              className="px-4 py-2 rounded-xl bg-white shadow-sm border hover:bg-gray-50 text-sm font-medium"
            >
              Find People
            </Link>
            <Link
              href="/events"
              className="px-4 py-2 rounded-xl bg-white shadow-sm border hover:bg-gray-50 text-sm font-medium"
            >
              Browse Events
            </Link>
            <Link
              href="/events/create"
              className="px-4 py-2 rounded-xl bg-purple-700 text-white shadow-sm hover:bg-purple-800 text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Event
            </Link>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="Search circles, challenges, or events…"
              />
            </div>

            <div className="flex gap-2">
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                Overview
              </TabButton>
              <TabButton active={tab === "circles"} onClick={() => setTab("circles")}>
                Circles
              </TabButton>
              <TabButton active={tab === "challenges"} onClick={() => setTab("challenges")}>
                Challenges
              </TabButton>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            {/* Left: Circles + Challenges + Events */}
            <div className="space-y-6">
              {/* Circles preview */}
              <SectionHeader
                title="Friend Circles 🔒"
                subtitle="Private groups for trusted sharing (best friends, classmates, etc.)."
                right={
                  <Link href="/community/circles" className="text-sm text-purple-700 font-semibold hover:underline">
                    View all
                  </Link>
                }
              />
              <div className="grid sm:grid-cols-2 gap-4">
                {!circlesAvailable ? (
                  <ComingSoonCard
                    title="Circles are not enabled yet"
                    description="Create the circles tables, then this section becomes realtime."
                  />
                ) : filteredCircles.slice(0, 4).length === 0 ? (
                  <EmptyCard
                    icon={<Users className="w-5 h-5" />}
                    title="No circles yet"
                    description="Create your first circle to share safely with a smaller group."
                    action={
                      <Link
                        href="/community/circles/new"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-sm font-semibold"
                      >
                        <Plus className="w-4 h-4" /> Create Circle
                      </Link>
                    }
                  />
                ) : (
                  filteredCircles.slice(0, 4).map((c) => (
                    <CircleCard key={c.id} circle={c} />
                  ))
                )}
              </div>

              {/* Challenges preview */}
              <SectionHeader
                title="FeelUp Challenges 🌱"
                subtitle="Weekly/monthly growth challenges that motivate without pressure."
                right={
                  <Link href="/community/challenges" className="text-sm text-purple-700 font-semibold hover:underline">
                    View all
                  </Link>
                }
              />
              <div className="grid sm:grid-cols-2 gap-4">
                {!challengesAvailable ? (
                  <ComingSoonCard
                    title="Challenges are not enabled yet"
                    description="Create the challenges tables, then this section becomes realtime."
                  />
                ) : filteredChallenges.slice(0, 4).length === 0 ? (
                  <EmptyCard
                    icon={<Flame className="w-5 h-5" />}
                    title="No challenges yet"
                    description="Start a simple weekly challenge like “No self-criticism week”."
                  />
                ) : (
                  filteredChallenges.slice(0, 4).map((c) => (
                    <ChallengeCard key={c.id} challenge={c} />
                  ))
                )}
              </div>

              {/* Events preview */}
              <SectionHeader
                title="Events & Activities 🗓"
                subtitle="Create or join wellness, study, or fun events — local or virtual."
                right={
                  <Link href="/events" className="text-sm text-purple-700 font-semibold hover:underline">
                    View all
                  </Link>
                }
              />
              <div className="grid md:grid-cols-2 gap-4">
                {filteredEvents.slice(0, 6).length === 0 ? (
                  <EmptyCard
                    icon={<CalendarDays className="w-5 h-5" />}
                    title="No events right now"
                    description="Create one and invite followers or your circle."
                    action={
                      <Link
                        href="/events/create"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-sm font-semibold"
                      >
                        <Plus className="w-4 h-4" /> Create Event
                      </Link>
                    }
                  />
                ) : (
                  filteredEvents.slice(0, 6).map((e) => (
                    <EventMiniCard key={e.id} ev={e} />
                  ))
                )}
              </div>
            </div>

            {/* Right: Companion Finder + Suggested People */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-700" />
                      <h3 className="font-bold text-lg text-gray-900">Companion Finder 🧭</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Find a study partner, gym buddy, or beach-walk companion — matched by goals & interests.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
  onClick={() => router.push("/community/companions")}
  className="flex-1 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-sm font-semibold"
  type="button"
>
  Start matching
</button>
                  <button
                    onClick={() => router.push("/explore")}
                    className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold"
                    type="button"
                  >
                    Explore
                  </button>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Tip: later you can match using tags like <b>study</b>, <b>gym</b>, <b>walking</b>, <b>wellness</b>.
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-gray-900">Suggested People</h3>
                  <Link href="/explore" className="text-sm text-purple-700 font-semibold hover:underline">
                    See all
                  </Link>
                </div>

                <div className="space-y-3">
                  {suggested.length === 0 ? (
                    <div className="text-sm text-gray-500">No suggestions yet.</div>
                  ) : (
                    suggested.slice(0, 6).map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 truncate">
                            {p.full_name || p.username || "User"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {p.username ? `@${p.username}` : "—"}
                          </div>
                        </div>

                        <button
                          onClick={() => router.push(`/profile/${p.id}`)}
                          className="text-sm text-purple-700 font-semibold inline-flex items-center gap-1 hover:underline"
                          type="button"
                        >
                          View <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border p-6 text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">🤝 Community Guidelines</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Respect, empathy, and safety are our priorities.
                </p>
                <button
                  onClick={() => router.push("/community-guidelines")}
                  className="px-5 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-sm font-semibold"
                  type="button"
                >
                  Read Guidelines
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "circles" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Circles</h2>
                <p className="text-sm text-gray-600">Private groups for trusted sharing.</p>
              </div>

              <Link
                href="/community/circles/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> Create Circle
              </Link>
            </div>

            {!circlesAvailable ? (
              <ComingSoonCard
                title="Circles not enabled yet"
                description="Create community_circles + circle_members tables and add RLS, then this becomes realtime."
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCircles.length === 0 ? (
                  <EmptyCard
                    icon={<Users className="w-5 h-5" />}
                    title="No circles found"
                    description="Try a different search or create a new circle."
                  />
                ) : (
                  filteredCircles.map((c) => <CircleCard key={c.id} circle={c} showLink />)
                )}
              </div>
            )}
          </div>
        )}

        {tab === "challenges" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Challenges</h2>
                <p className="text-sm text-gray-600">Weekly/monthly growth challenges for gentle accountability.</p>
              </div>

              <button
                onClick={() => showToast("Create Challenge UI coming next ✅")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-sm font-semibold"
                type="button"
              >
                <Plus className="w-4 h-4" /> Create Challenge
              </button>
            </div>

            {!challengesAvailable ? (
              <ComingSoonCard
                title="Challenges not enabled yet"
                description="Create challenges + challenge_participants tables and add RLS, then this becomes realtime."
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredChallenges.length === 0 ? (
                  <EmptyCard
                    icon={<Flame className="w-5 h-5" />}
                    title="No challenges found"
                    description="Try a different search."
                  />
                ) : (
                  filteredChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} showLink />)
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
        active ? "bg-purple-700 text-white border-purple-700" : "bg-white hover:bg-gray-50 text-gray-800"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function EmptyCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
      <div className="mx-auto w-11 h-11 rounded-2xl bg-gray-50 border flex items-center justify-center text-gray-700">
        {icon}
      </div>
      <h3 className="mt-3 font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <div className="flex items-center gap-2 text-purple-700 font-semibold">
        <Sparkles className="w-4 h-4" />
        Coming soon
      </div>
      <div className="mt-2 text-lg font-bold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{description}</div>
    </div>
  );
}

function CircleCard({ circle, showLink }: { circle: Circle; showLink?: boolean }) {
  const vis = badgeForVisibility(circle.visibility || "public");
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-gray-900 truncate">{circle.name}</div>
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{circle.description || "A trusted space for sharing."}</div>
        </div>

        <span className={`shrink-0 text-xs border px-2 py-1 rounded-full ${vis.className}`}>
          {vis.label}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>Created {fmtDate(circle.created_at)}</span>
        {showLink ? (
          <Link
            href={`/community/circles/${circle.id}`}
            className="text-purple-700 font-semibold hover:underline inline-flex items-center gap-1"
          >
            Open <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="text-gray-400">Preview</span>
        )}
      </div>
    </div>
  );
}

function ChallengeCard({ challenge, showLink }: { challenge: Challenge; showLink?: boolean }) {
  const vis = badgeForVisibility(challenge.visibility || "public");
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-gray-900 truncate">{challenge.title}</div>
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
            {challenge.description || "A gentle challenge to help you grow."}
          </div>
        </div>

        <span className={`shrink-0 text-xs border px-2 py-1 rounded-full ${vis.className}`}>
          {vis.label}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {challenge.starts_on ? fmtDate(challenge.starts_on) : "Start soon"}{" "}
          {challenge.ends_on ? `→ ${fmtDate(challenge.ends_on)}` : ""}
        </span>

        {showLink ? (
          <Link
            href={`/community/challenges/${challenge.id}`}
            className="text-purple-700 font-semibold hover:underline inline-flex items-center gap-1"
          >
            Open <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="text-gray-400">Preview</span>
        )}
      </div>
    </div>
  );
}

function EventMiniCard({ ev }: { ev: EventRow }) {
  const vis = badgeForVisibility(ev.visibility || "public");
  return (
    <Link href={`/events/${ev.id}`} className="block bg-white rounded-2xl shadow-sm border p-5 hover:shadow transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-gray-900 truncate">{ev.title}</div>
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{ev.description || "Tap to view details."}</div>
        </div>

        <span className={`shrink-0 text-xs border px-2 py-1 rounded-full ${vis.className}`}>
          {vis.label}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {fmtDate(ev.event_date)} {ev.event_time ? `· ${fmtTime(ev.event_time)}` : ""}
        </span>
        <span className="text-purple-700 font-semibold inline-flex items-center gap-1">
          View <ChevronRight className="w-4 h-4" />
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {ev.is_virtual ? "💻 Virtual" : ev.location ? `📍 ${ev.location}` : "📍 Location TBD"}
        {ev.category ? <span className="ml-2">· 🏷 {ev.category}</span> : null}
      </div>
    </Link>
  );
}
