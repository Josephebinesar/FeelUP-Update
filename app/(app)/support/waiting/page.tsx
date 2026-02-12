"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function SupportWaitingPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const sp = useSearchParams();
  const router = useRouter();

  const ticketId = sp.get("ticketId") || "";
  const sessionIdFromUrl = sp.get("sessionId") || "";

  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("checking");
  const [assigned, setAssigned] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    let timer: any = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;

      if (!token) {
        setErr("Please log in to connect to a psychologist.");
        return;
      }
      if (!ticketId) {
        setErr("Missing ticketId.");
        return;
      }

      async function poll() {
        if (stop) return;

        try {
          const res = await fetch("/api/support/ticket-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ticketId }),
          });

          const json = await res.json().catch(() => ({} as any));
          if (!res.ok) throw new Error(json?.error || "Failed");

          setStatus(String(json.status || "unknown"));
          setAssigned(json.assignedPsychologistId ?? null);

          // ✅ if psychologist joined, send user back to AI Buddy LOCKED
          if (json.status === "in_progress") {
            const sid = sessionIdFromUrl || json.sessionId || "";
            router.replace(
              `/ai-buddy?sessionId=${encodeURIComponent(sid)}&ticketId=${encodeURIComponent(
                ticketId
              )}&locked=1`
            );
            return;
          }

          // ✅ if psychologist ended conversation, resume AI Buddy NORMAL
          if (json.status === "resolved") {
            const sid = sessionIdFromUrl || json.sessionId || "";
            router.replace(`/ai-buddy?sessionId=${encodeURIComponent(sid)}`);
            return;
          }
        } catch (e: any) {
          setErr(String(e?.message ?? e));
        }

        timer = setTimeout(poll, 2500);
      }

      poll();
    })();

    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [supabase, ticketId, sessionIdFromUrl, router]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-xl bg-white border rounded-2xl p-5 shadow-sm">
        <h1 className="text-lg font-semibold">Connecting you to a psychologist…</h1>

        <p className="mt-2 text-sm text-gray-600">
          Please stay on this screen. We are notifying an available psychologist.
        </p>

        <div className="mt-4 text-sm">
          <div>
            Status: <b>{status}</b>
          </div>
          <div className="mt-1">
            Assigned: <b>{assigned ? "Yes" : "Not yet"}</b>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          If you feel unsafe right now, contact local emergency services or a trusted person immediately.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
            {err}
          </div>
        ) : null}
      </div>
    </div>
  );
}
