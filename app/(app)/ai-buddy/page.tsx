"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { RefreshCw, SendHorizontal } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; created_at?: string };

export default function AIBuddyPage() {
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

  const quickPrompts = [
    "I just had a breakup and I can’t stop thinking about them.",
    "I feel anxious and my mind is racing.",
    "I feel lonely and I don’t have anyone to talk to.",
    "I can’t sleep and I feel stressed.",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // resume chat
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("feelup_ai_session") : null;
    if (saved) setSessionId(saved);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    localStorage.setItem("feelup_ai_session", sessionId);

    (async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("load chat messages error:", error);
        return;
      }

      if (data && data.length > 0) setMessages(data as Msg[]);
    })();
  }, [sessionId, supabase]);

  function startNewChat() {
    setSessionId(null);
    localStorage.removeItem("feelup_ai_session");
    setSeverity(null);
    setEscalated(false);
    setInput("");
    setMessages([
      {
        role: "assistant",
        content:
          "New chat started. What’s on your mind right now?\n\nI’m not a doctor—just an assistant.",
      },
    ]);
  }

  async function send(customText?: string) {
    const text = (customText ?? input).trim();
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

      if (!sessionId) {
        setSessionId(json.sessionId);
        localStorage.setItem("feelup_ai_session", json.sessionId);
      }

      setSeverity(json.severity);
      setEscalated(Boolean(json.escalated));

      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch {
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
        <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold">AI Buddy</h1>
                <p className="text-sm text-gray-600">
                  I’m not a doctor—just an assistant. If you’re in immediate danger, contact local emergency services.
                </p>
              </div>

              <button
                onClick={startNewChat}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {severity !== null ? <span>Severity: {severity}</span> : <span>Severity: —</span>}
              </div>

              {escalated ? (
                <div className="text-xs inline-flex rounded-full bg-red-50 text-red-700 px-2 py-1">
                  Escalation triggered (psychologist)
                </div>
              ) : (
                <div className="text-xs inline-flex rounded-full bg-green-50 text-green-700 px-2 py-1">
                  Support mode
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pt-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  disabled={loading}
                  className="text-xs rounded-full border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                >
                  {p.length > 34 ? p.slice(0, 34) + "…" : p}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 h-[62vh] overflow-y-auto space-y-3">
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
                Your situation looks serious. We’ve created an escalation request to connect you with a psychologist.
              </div>
            </div>
          ) : null}

          <div className="p-4 border-t flex gap-2">
            <textarea
              className="flex-1 min-h-[44px] max-h-[130px] resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Share what you're feeling… (Enter = send, Shift+Enter = new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
            />
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 inline-flex items-center gap-2"
              onClick={() => send()}
              disabled={loading}
              type="button"
            >
              <SendHorizontal className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
