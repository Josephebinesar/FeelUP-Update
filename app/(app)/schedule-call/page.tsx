"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function ScheduleCallPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const sp = useSearchParams();
  const router = useRouter();

  const ticketId = sp.get("ticketId");
  const [dt, setDt] = useState(""); // ISO-like from input
  const [loading, setLoading] = useState(false);

  async function request() {
    if (!ticketId || !dt) return alert("Pick date & time");
    setLoading(true);

    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;

    const res = await fetch("/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ticketId, scheduledAt: new Date(dt).toISOString(), mode: "video" }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) return alert(json?.error || "Failed");

    alert("Appointment request sent. Psychologist will confirm soon.");
    router.replace("/mood-feed");
  }

  if (!ticketId) return <div className="p-6">Missing ticketId</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-xl bg-white border rounded-2xl p-6">
        <h1 className="text-lg font-semibold">Schedule a Video Call</h1>
        <p className="text-sm text-gray-600 mt-1">
          Choose a suitable time. A psychologist will confirm.
        </p>

        <div className="mt-5">
          <label className="text-sm font-medium">Pick date & time</label>
          <input
            type="datetime-local"
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
            value={dt}
            onChange={(e) => setDt(e.target.value)}
          />
        </div>

        <button
          onClick={request}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-blue-600 text-white py-2 text-sm disabled:opacity-60"
        >
          Request Appointment
        </button>
      </div>
    </div>
  );
}
