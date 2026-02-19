"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Bell,
  User as UserIcon,
  Filter,
  Plus,
  Video,
  IndianRupee,
  Gauge,
  Timer,
} from "lucide-react";

type RSVPStatus = "going" | "interested";
type Visibility = "public" | "followers" | "circle";
type ReminderKind = "1h" | "1d";
type ReminderMap = Record<ReminderKind, boolean>;

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  event_date: string; // YYYY-MM-DD
  event_time: string | null; // HH:mm:ss or null
  duration: string | null;
  location: string | null;
  is_virtual: boolean | null;
  organizer: string; // uuid
  attendees: number | null;
  attendees_count: number | null;
  max_attendees: number | null;
  tags: string[] | null;
  difficulty: string | null;
  price: number | null;
  created_at: string | null;
  visibility: Visibility | null;
  circle_id: string | null;
  cover_image_url: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

const CATEGORY_PRESETS = [
  "Wellness",
  "Study",
  "Gym",
  "Walking",
  "Beach",
  "Music",
  "Support",
  "Fun",
  "Enjoyment",
] as const;

function safeTime(t: string | null) {
  return t ? t.slice(0, 5) : "—";
}

/**
 * event over logic:
 * - if event_time exists -> compare exact datetime
 * - if no time -> treat end of day as 23:59:59
 */
function isEventOver(e: Pick<EventRow, "event_date" | "event_time">) {
  const now = new Date();

  if (e.event_time) {
    const hhmm = e.event_time.slice(0, 5);
    const dt = new Date(`${e.event_date}T${hhmm}:00`);
    return dt.getTime() < now.getTime();
  }

  const endOfDay = new Date(`${e.event_date}T23:59:59`);
  return endOfDay.getTime() < now.getTime();
}

export default function EventsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [myRSVPs, setMyRSVPs] = useState<Record<string, RSVPStatus>>({});
  const [myReminders, setMyReminders] = useState<Record<string, ReminderMap>>(
    {}
  );

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeTag, setActiveTag] = useState<string>("All");

  const logErr = (label: string, err: any) => {
    console.error(label, err?.message || err);
  };

  const attendeesShown = (e: EventRow) =>
    (e.attendees_count ?? e.attendees ?? 0) as number;

  const fetchProfilesForOrganizers = useCallback(
    async (organizerIds: string[]) => {
      const ids = Array.from(new Set(organizerIds.filter(Boolean)));
      if (ids.length === 0) return;

      const res = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", ids);

      if (res.error) {
        logErr("LOAD ORGANIZER PROFILES ERROR:", res.error);
        return;
      }

      const map: Record<string, Profile> = {};
      (res.data || []).forEach((p: any) => (map[p.id] = p));
      setProfilesMap(map);
    },
    [supabase]
  );

  const loadEvents = useCallback(async () => {
    const res = await supabase
      .from("events")
      .select(
        "id,title,description,category,event_date,event_time,duration,location,is_virtual,organizer,attendees,attendees_count,max_attendees,tags,difficulty,price,created_at,visibility,circle_id,cover_image_url"
      )
      .order("event_date", { ascending: true });

    if (res.error) {
      logErr("LOAD EVENTS ERROR:", res.error);
      setEvents([]);
      return;
    }

    // ✅ keep only upcoming (NOT over)
    const upcoming = ((res.data || []) as EventRow[]).filter(
      (e) => !isEventOver(e)
    );

    // ✅ sort by nearest datetime first
    upcoming.sort((a, b) => {
      const aTime = a.event_time ? a.event_time.slice(0, 5) : "00:00";
      const bTime = b.event_time ? b.event_time.slice(0, 5) : "00:00";
      const ad = new Date(`${a.event_date}T${aTime}:00`).getTime();
      const bd = new Date(`${b.event_date}T${bTime}:00`).getTime();
      return ad - bd;
    });

    setEvents(upcoming);
    fetchProfilesForOrganizers(upcoming.map((e) => e.organizer));
  }, [supabase, fetchProfilesForOrganizers]);

  const loadMyRSVPs = useCallback(
    async (uid: string) => {
      const res = await supabase
        .from("event_rsvps")
        .select("event_id, status")
        .eq("user_id", uid);

      if (res.error) {
        logErr("LOAD MY RSVPS ERROR:", res.error);
        return;
      }

      const map: Record<string, RSVPStatus> = {};
      (res.data || []).forEach((r: any) => {
        if (
          r?.event_id &&
          (r.status === "going" || r.status === "interested")
        ) {
          map[r.event_id] = r.status;
        }
      });
      setMyRSVPs(map);
    },
    [supabase]
  );

  const loadMyReminders = useCallback(
    async (uid: string) => {
      const res = await supabase
        .from("event_reminders")
        .select("event_id, kind")
        .eq("user_id", uid);

      if (res.error) {
        logErr("LOAD MY REMINDERS ERROR:", res.error);
        return;
      }

      const map: Record<string, ReminderMap> = {};
      (res.data || []).forEach((r: any) => {
        const eventId: string | undefined = r?.event_id;
        const kind: unknown = r?.kind;

        if (!eventId) return;
        if (kind !== "1h" && kind !== "1d") return; // ✅ TS-safe guard

        map[eventId] = map[eventId] ?? { "1h": false, "1d": false };
        map[eventId][kind] = true; // kind is narrowed to ReminderKind here
      });

      setMyReminders(map);
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const uid = data.user?.id ?? null;
      setUserId(uid);

      await loadEvents();
      if (uid) {
        await loadMyRSVPs(uid);
        await loadMyReminders(uid);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, loadEvents, loadMyRSVPs, loadMyReminders]);

  /* -------------------- REALTIME -------------------- */
  useEffect(() => {
    const chEvents = supabase
      .channel("rt-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => loadEvents()
      )
      .subscribe();

    const chRsvps = supabase
      .channel("rt-event-rsvps")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_rsvps" },
        () => {
          loadEvents();
          if (userId) loadMyRSVPs(userId);
        }
      )
      .subscribe();

    const chReminders = supabase
      .channel("rt-event-reminders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_reminders" },
        () => {
          if (userId) loadMyReminders(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chEvents);
      supabase.removeChannel(chRsvps);
      supabase.removeChannel(chReminders);
    };
  }, [supabase, loadEvents, loadMyRSVPs, loadMyReminders, userId]);

  /* -------------------- ACTIONS -------------------- */

  async function setRSVP(eventId: string, status: RSVPStatus) {
    if (!userId) return router.push("/login");

    const res = await supabase.from("event_rsvps").upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: "user_id,event_id" }
    );

    if (res.error) logErr("RSVP ERROR:", res.error);

    await loadEvents();
    await loadMyRSVPs(userId);
  }

  async function leaveEvent(eventId: string) {
    if (!userId) return;

    const res = await supabase
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (res.error) logErr("LEAVE EVENT ERROR:", res.error);

    await loadEvents();
    await loadMyRSVPs(userId);
  }

  async function toggleReminder(event: EventRow, kind: ReminderKind) {
    if (!userId) return router.push("/login");

    const current: ReminderMap = myReminders[event.id] ?? {
      "1h": false,
      "1d": false,
    };

    const already = current[kind];

    if (already) {
      const del = await supabase
        .from("event_reminders")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", userId)
        .eq("kind", kind);

      if (del.error) logErr("DELETE REMINDER ERROR:", del.error);
    } else {
      const time = event.event_time ? safeTime(event.event_time) : "00:00";
      const start = new Date(`${event.event_date}T${time}:00`);

      const remindAt = new Date(start);
      remindAt.setHours(remindAt.getHours() - (kind === "1h" ? 1 : 24));

      const ins = await supabase.from("event_reminders").insert({
        event_id: event.id,
        user_id: userId,
        kind,
        remind_at: remindAt.toISOString(),
      });

      if (ins.error) logErr("CREATE REMINDER ERROR:", ins.error);
    }

    await loadMyReminders(userId);
  }

  async function shareEvent(eventId: string) {
    try {
      const url = `${window.location.origin}/events/${eventId}`;
      await navigator.clipboard.writeText(url);
      alert("Event link copied ✅");
    } catch {
      alert("Copy failed (browser blocked).");
    }
  }

  /* -------------------- FILTERS -------------------- */

  const allTags = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => (e.tags || []).forEach((t) => t && s.add(t)));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter((e) => {
      const text = `${e.title} ${e.description || ""} ${
        e.location || ""
      } ${(e.tags || []).join(" ")}`.toLowerCase();

      const okSearch = text.includes(q);
      const okCat =
        activeCategory === "All"
          ? true
          : (e.category || "") === activeCategory;
      const okTag =
        activeTag === "All" ? true : (e.tags || []).includes(activeTag);

      return okSearch && okCat && okTag;
    });
  }, [events, search, activeCategory, activeTag]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading events…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Community Events</h1>
            <p className="text-gray-600 text-sm mt-1">
              Join wellness, study, and fun activities — with safe visibility
              controls.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/events/my")}
              className="border px-4 py-2 rounded-lg bg-white"
              type="button"
            >
              My Events
            </button>

            <button
              onClick={() => router.push("/events/create")}
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg"
              type="button"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <Filter className="w-4 h-4" />
            <span className="font-semibold text-sm">Filter</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, tags, location…"
              className="border rounded-lg px-3 py-2"
            />

            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="All">All categories</option>
              {CATEGORY_PRESETS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={activeTag}
              onChange={(e) => setActiveTag(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All tags" : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <p className="text-gray-600">No upcoming events found.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => {
              const host = profilesMap[event.organizer];
              const rsvp = myRSVPs[event.id];
              const remind: ReminderMap = myReminders[event.id] ?? {
                "1h": false,
                "1d": false,
              };

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Cover */}
                  {event.cover_image_url ? (
                    <div className="h-36 w-full bg-gray-100">
                      <img
                        src={event.cover_image_url}
                        alt="cover"
                        className="h-36 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-36 w-full bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100" />
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h2
                        className="text-lg font-bold leading-snug cursor-pointer hover:underline"
                        onClick={() => router.push(`/events/${event.id}`)}
                      >
                        {event.title}
                      </h2>

                      <button
                        onClick={() => shareEvent(event.id)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                        title="Share"
                        type="button"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 text-sm mt-2 line-clamp-3">
                        {event.description}
                      </p>
                    )}

                    {/* Host */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="leading-tight">
                          <div className="text-sm font-semibold">
                            {host?.full_name || host?.username || "Host"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {host?.username ? `@${host.username}` : "Organizer"}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          router.push(`/profile/${event.organizer}`)
                        }
                        className="text-xs text-blue-600 hover:underline"
                        type="button"
                      >
                        View organizer
                      </button>
                    </div>

                    {/* Meta */}
                    <div className="text-sm text-gray-500 space-y-1 mt-4">
                      <div className="flex gap-2 items-center">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.event_date).toDateString()}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Clock className="w-4 h-4" />
                        {safeTime(event.event_time)}
                      </div>
                      <div className="flex gap-2 items-center">
                        <MapPin className="w-4 h-4" />
                        {event.location || "Online / TBA"}
                      </div>

                      <div className="flex gap-2 items-center">
                        <Users className="w-4 h-4" />
                        {attendeesShown(event)} going
                        {event.max_attendees ? (
                          <span className="text-xs text-gray-400">
                            / {event.max_attendees}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex gap-3 items-center flex-wrap pt-2">
                        {event.is_virtual ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            <Video className="w-3 h-3" /> Virtual
                          </span>
                        ) : null}

                        {event.duration ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            <Timer className="w-3 h-3" /> {event.duration}
                          </span>
                        ) : null}

                        {event.difficulty ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            <Gauge className="w-3 h-3" /> {event.difficulty}
                          </span>
                        ) : null}

                        {typeof event.price === "number" ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                            <IndianRupee className="w-3 h-3" /> {event.price}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {event.category && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {event.category}
                        </span>
                      )}
                      {(event.tags || []).slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {/* Reminders */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => toggleReminder(event, "1h")}
                        className={`flex-1 text-xs px-3 py-2 rounded-lg border inline-flex items-center justify-center gap-2 ${
                          remind["1h"] ? "bg-black text-white border-black" : ""
                        }`}
                        type="button"
                      >
                        <Bell className="w-3 h-3" />
                        1 hour
                      </button>
                      <button
                        onClick={() => toggleReminder(event, "1d")}
                        className={`flex-1 text-xs px-3 py-2 rounded-lg border inline-flex items-center justify-center gap-2 ${
                          remind["1d"] ? "bg-black text-white border-black" : ""
                        }`}
                        type="button"
                      >
                        <Bell className="w-3 h-3" />
                        1 day
                      </button>
                    </div>

                    {/* RSVP */}
                    <div className="flex gap-2 mt-3">
                      {rsvp === "going" ? (
                        <button
                          onClick={() => leaveEvent(event.id)}
                          className="flex-1 bg-red-500 text-white py-2 rounded-lg"
                          type="button"
                        >
                          Leave
                        </button>
                      ) : (
                        <button
                          onClick={() => setRSVP(event.id, "going")}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
                          type="button"
                        >
                          Join
                        </button>
                      )}

                      <button
                        onClick={() => setRSVP(event.id, "interested")}
                        className={`flex-1 border py-2 rounded-lg ${
                          rsvp === "interested" ? "bg-gray-100" : ""
                        }`}
                        type="button"
                      >
                        Interested
                      </button>
                    </div>

                    <button
                      onClick={() => router.push(`/events/${event.id}`)}
                      className="w-full mt-3 text-sm py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                      type="button"
                    >
                      Open event
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
