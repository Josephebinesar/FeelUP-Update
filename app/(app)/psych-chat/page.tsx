"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Msg = { role: string; content: string; created_at: string };

export default function PsychChatPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const sp = useSearchParams();
  const router = useRouter();

  const sessionId = sp.get("sessionId");
  const ticketId = sp.get("ticketId");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace("/login");

      const { data } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      setMsgs((data as any) ?? []);
    })();
  }, [sessionId, supabase, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || !sessionId || !ticketId || loading) return;

    setInput("");
    setLoading(true);

    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;

    const res = await fetch("/api/psych/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ sessionId, ticketId, message: text }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "Failed");
      return;
    }

    setMsgs((prev) => [...prev, { role: "user", content: text, created_at: new Date().toISOString() }]);
  }

  if (!sessionId || !ticketId) {
    return <div className="p-6">Missing sessionId/ticketId</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-4">
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 border-b">
            <h1 className="font-semibold">Chat with Psychologist</h1>
            <p className="text-sm text-gray-600">A psychologist will respond here. You can still use AI Buddy separately.</p>
          </div>

          <div className="p-4 h-[65vh] overflow-y-auto space-y-3">
            {msgs.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : m.role === "psychologist"
                    ? "mr-auto bg-green-100 text-gray-900"
                    : "mr-auto bg-gray-100 text-gray-900"
                }`}
              >
                {m.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={loading}
            />
            <button onClick={send} className="rounded-xl bg-blue-600 px-4 py-2 text-white text-sm" disabled={loading}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
