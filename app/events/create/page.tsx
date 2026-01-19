"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { // } from "@/lib/supabaseClient";

export default function CreateEventPage() {
  const supabase = //();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [loading, setLoading] = useState(false);

  async function createEvent() {
    setLoading(true);

    const { data: { user } } = await //.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("events").insert({
      title,
      description,
      event_date: eventDate,
      event_time: eventTime,
      organizer: user.id,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/events");
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Create Event</h1>

      <input
        className="input-field"
        placeholder="Event title"
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="input-field"
        placeholder="Event description"
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="date"
        className="input-field"
        onChange={(e) => setEventDate(e.target.value)}
      />

      <input
        type="time"
        className="input-field"
        onChange={(e) => setEventTime(e.target.value)}
      />

      <button
        onClick={createEvent}
        disabled={loading}
        className="w-full py-2 bg-black text-white rounded"
      >
        {loading ? "Creating..." : "Create Event"}
      </button>
    </main>
  );
}
