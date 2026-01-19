"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trash2,
} from "lucide-react";

/* ----------------------------- TYPES ----------------------------- */

type RSVPStatus = "going" | "interested";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  attendees_count: number;
  organizer: string;
}

/* ----------------------------- PAGE ----------------------------- */

export default function EventsPage() {
  const router = useRouter();

  // ✅ SAFE SINGLETON CLIENT (DO NOT INLINE)
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [events, setEvents] = useState<Event[]>([]);
  const [myRSVPs, setMyRSVPs] = useState<Record<string, RSVPStatus>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------- LOAD EVENTS -------------------------- */

  const loadEvents = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date");

    setEvents(data || []);
  }, [supabase]);

  /* -------------------------- AUTH SAFE INIT -------------------------- */

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const user = data.user ?? null;
      setUserId(user?.id ?? null);

      await loadEvents();

      if (user) {
        const { data: rsvps } = await supabase
          .from("event_rsvps")
          .select("event_id, status")
          .eq("user_id", user.id);

        if (!mounted) return;

        const map: Record<string, RSVPStatus> = {};
        rsvps?.forEach((r) => {
          map[r.event_id] = r.status;
        });

        setMyRSVPs(map);
      }

      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [supabase, loadEvents]);

  /* ----------------------------- RSVP ----------------------------- */

  async function setRSVP(eventId: string, status: RSVPStatus) {
    if (!userId) {
      router.push("/login");
      return;
    }

    await supabase.from("event_rsvps").upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: "user_id,event_id" }
    );

    await loadEvents();
  }

  async function leaveEvent(eventId: string) {
    if (!userId) return;

    await supabase
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    await loadEvents();
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Delete this event permanently?")) return;

    await supabase.from("events").delete().eq("id", eventId);
    await loadEvents();
  }

  /* ----------------------------- UI ----------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading events…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Community Events
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => {
          const rsvp = myRSVPs[event.id];

          return (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow p-6"
            >
              {userId === event.organizer && (
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="float-right text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <h2 className="text-xl font-bold mb-2">
                {event.title}
              </h2>

              <p className="text-gray-600 text-sm mb-4">
                {event.description}
              </p>

              <div className="text-sm text-gray-500 space-y-1 mb-4">
                <div className="flex gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(event.event_date).toDateString()}
                </div>
                <div className="flex gap-2">
                  <Clock className="w-4 h-4" />
                  {event.event_time}
                </div>
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </div>
                <div className="flex gap-2">
                  <Users className="w-4 h-4" />
                  {event.attendees_count} attending
                </div>
              </div>

              <div className="flex gap-2">
                {rsvp === "going" ? (
                  <button
                    onClick={() => leaveEvent(event.id)}
                    className="flex-1 bg-red-500 text-white py-2 rounded"
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    onClick={() => setRSVP(event.id, "going")}
                    className="flex-1 bg-blue-600 text-white py-2 rounded"
                  >
                    Join
                  </button>
                )}

                {rsvp !== "interested" && (
                  <button
                    onClick={() =>
                      setRSVP(event.id, "interested")
                    }
                    className="flex-1 border py-2 rounded"
                  >
                    Interested
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




