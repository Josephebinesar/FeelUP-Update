"use client";

import { useEffect, useState } from "react";
import { // } from "@/lib/supabaseClient";

export default function MyEventsPage() {
  const supabase = //();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function loadMyEvents() {
      const { data: { user } } = await //.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("events")
        .select("id,title,event_rsvps(count)")
        .eq("organizer", user.id);

      setEvents(data ?? []);
    }

    loadMyEvents();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Events</h1>

      {events.map((event) => (
        <div key={event.id} className="mb-3">
          <p className="font-medium">{event.title}</p>
          <p className="text-sm text-gray-500">
            Attendees: {event.event_rsvps?.[0]?.count ?? 0}
          </p>
        </div>
      ))}
    </main>
  );
}
