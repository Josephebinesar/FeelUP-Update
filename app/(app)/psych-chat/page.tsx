"use client";

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { SendHorizontal, ArrowLeft, RefreshCw } from "lucide-react";

type Msg = { role: string; content: string; created_at: string };

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleString();
}

export default function PsychChatPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const sp = useSearchParams();
  const router = useRouter();

  const sessionId = sp.get("sessionId");
  const ticketId = sp.get("ticketId");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* ── Load initial messages ── */
  const loadMessages = useCallback(async () => {
    if (!sessionId) return;

    const { data } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    setMsgs((data as any) ?? []);
  }, [sessionId, supabase]);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.replace("/login"); return; }
      await loadMessages();
      setInitialLoading(false);
    })();
  }, [sessionId, supabase, router, loadMessages]);

  /* ── ✅ FIXED: Realtime subscription so psychologist replies appear instantly ── */
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`psych-chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.content && row?.role) {
            setMsgs((prev) => {
              // Avoid duplicates (optimistic UI)
              const exists = prev.some(
                (m) => m.created_at === row.created_at && m.content === row.content
              );
              if (exists) return prev;
              return [...prev, { role: row.role, content: row.content, created_at: row.created_at }];
            });
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, supabase]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  /* ── Send ── */
  async function send() {
    const text = input.trim();
    if (!text || !sessionId || !ticketId || loading) return;

    setInput("");
    setLoading(true);

    // Optimistic
    const optimistic: Msg = {
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);

    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;

    const res = await fetch("/api/psych/chat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ sessionId, ticketId, message: text }),
    });

    const json = await res.json().catch(() => ({} as any));
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "Failed to send message");
      // Rollback optimistic
      setMsgs((prev) => prev.filter((m) => m !== optimistic));
    }
    // Realtime will add the confirmed message
  }

  if (!sessionId || !ticketId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded-2xl p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Missing Parameters</h2>
          <p className="text-sm text-gray-600 mb-4">
            This page requires a valid sessionId and ticketId.
          </p>
          <button
            onClick={() => router.replace("/ai-buddy")}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
          >
            Go to AI Buddy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <div className="flex-1 flex flex-col mx-auto w-full max-w-3xl p-4">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                connected
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {connected ? "Live" : "Connecting…"}
            </span>

            <button
              onClick={loadMessages}
              className="p-2 rounded-xl border bg-white hover:bg-gray-50"
              type="button"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Chat card */}
        <div className="flex-1 flex flex-col bg-white border rounded-2xl overflow-hidden shadow-sm">
          {/* Chat header */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <h1 className="font-semibold text-gray-900">Chat with Psychologist</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              A licensed psychologist is responding here. AI Buddy is paused.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[50vh] max-h-[60vh]">
            {initialLoading ? (
              <div className="text-center text-sm text-gray-400 py-8">Loading messages…</div>
            ) : msgs.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">
                Waiting for the psychologist to join the conversation…
              </div>
            ) : (
              msgs.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                        m.role === "user"
                          ? "bg-blue-600 text-white"
                          : m.role === "psychologist"
                          ? "bg-emerald-50 text-gray-900 border border-emerald-200"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {m.role === "psychologist" && (
                        <div className="text-xs text-emerald-700 font-semibold mb-1">Psychologist</div>
                      )}
                      {m.content}
                    </div>
                    <div
                      className={`text-[11px] text-gray-400 mt-1 ${
                        m.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {timeAgo(m.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-end">
                <div className="bg-blue-100 text-blue-700 text-xs rounded-full px-3 py-1.5">
                  Sending…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t p-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message to the psychologist…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
                rows={1}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="rounded-xl bg-blue-600 px-3 py-2 text-white disabled:opacity-60 inline-flex items-center gap-1.5 text-sm"
                type="button"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
