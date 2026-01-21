"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function MyEventsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const safeTime = (t: string | null) => (t ? t.slice(0, 5) : "—");
  const attendeesShown = (e: any) => e.attendees_count ?? e.attendees ?? 0;

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await supabase
        .from("events")
        .select("id,title,event_date,event_time,attendees,attendees_count,visibility")
        .eq("organizer", user.id)
        .order("event_date", { ascending: true });

      if (!mounted) return;

      setEvents(res.data || []);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  if (loading) return <div className="p-8 text-center">Loading my events…</div>;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Events</h1>
          <button
            onClick={() => router.push("/events/create")}
            className="bg-black text-white px-4 py-2 rounded-lg"
            type="button"
          >
            Create Event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-600">You haven’t created any events yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(e.event_date).toDateString()} · {safeTime(e.event_time)} ·{" "}
                    {attendeesShown(e)} going · {e.visibility}
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/events/${e.id}`)}
                  className="text-blue-600 text-sm hover:underline"
                  type="button"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
