"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { // } from "@/lib/supabaseClient";

export default function EventDetailPage() {
  const { id } = useParams();
  const supabase = //();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setEvent(data));
  }, [id]);

  if (!event) return <p>Loading...</p>;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{event.title}</h1>
      <p className="mt-2 text-gray-600">{event.description}</p>
      <p className="mt-4">📍 {event.location}</p>
      <p>👥 {event.attendees} attending</p>
    </main>
  );
}
