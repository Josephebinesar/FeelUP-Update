"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Msg = { role: "user" | "assistant"; content: string };

export default function SupportBuddyPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi, I’m FeelUp Support Buddy. You can share what you’re feeling and I’ll help you step-by-step.\n\nI’m not a doctor—just an assistant.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [severity, setSeverity] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth.session?.access_token;

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          message: text,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");

      if (!sessionId) setSessionId(json.sessionId);

      setSeverity(json.severity);
      setEscalated(Boolean(json.escalated));

      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong while responding. Please try again.\n\nI’m not a doctor—just an assistant.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl bg-white shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold">FeelUp Support Buddy</h1>
                <p className="text-sm text-gray-600">
                  I’m not a doctor—just an assistant. If you’re in immediate danger, contact local emergency services.
                </p>
              </div>
              <div className="text-right text-xs text-gray-600">
                {severity !== null ? <div>Severity: {severity}</div> : null}
                {escalated ? (
                  <div className="mt-1 inline-flex rounded-full bg-red-50 text-red-700 px-2 py-1">
                    Escalation triggered
                  </div>
                ) : (
                  <div className="mt-1 inline-flex rounded-full bg-green-50 text-green-700 px-2 py-1">
                    Support mode
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 h-[65vh] overflow-y-auto space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-gray-100 text-gray-900"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading ? (
              <div className="mr-auto max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-gray-100 text-gray-900">
                Typing…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {escalated ? (
            <div className="px-4 pb-2">
              <div className="rounded-xl border bg-yellow-50 p-3 text-sm text-yellow-900">
                Your situation looks serious. We’ll connect you to a psychologist in the next step inside FeelUp.
              </div>
            </div>
          ) : null}

          <div className="p-4 border-t flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Share what you're feeling…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={loading}
            />
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              onClick={send}
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          Tip: Try “I just had a breakup and I can’t stop thinking about them.”
        </div>
      </div>
    </div>
  );
}
