"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Msg = { id?: string; role: string; content: string; created_at: string };

function routeByEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "/admin";
  if (e.endsWith("@psychologist.feelup")) return "/psychologist";
  return "/mood-feed";
}

function labelForRole(role: string) {
  if (role === "user") return "User";
  if (role === "assistant" || role === "ai") return "AI";
  if (role === "psychologist") return "Psychologist";
  return role;
}

export default function PsychologistChatPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const sp = useSearchParams();
  const router = useRouter();

  const sessionId = sp.get("sessionId") || "";
  const ticketId = sp.get("ticketId") || "";

  const [loading, setLoading] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ✅ guard psychologist/admin
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      if (!user) {
        router.replace("/login");
        return;
      }

      const email = user.email ?? null;
      const ok =
        email?.toLowerCase().endsWith("@psychologist.feelup") ||
        email?.toLowerCase().endsWith("@admin.feelup");

      if (!ok) {
        router.replace(routeByEmail(email));
        return;
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // ✅ load all messages in the session (user + AI + psychologist)
  async function load() {
    if (!sessionId) {
      setMsgs([]);
      return;
    }
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!error) setMsgs((data as any) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ✅ realtime for new messages (user + AI + psychologist)
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`psy-chat-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as any;
          setMsgs((prev) => [...prev, row]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ✅ psychologist reply (optional)
  async function sendAsPsychologist() {
    const text = input.trim();
    if (!text) return;

    if (!sessionId || !ticketId) {
      alert("Missing sessionId/ticketId. Open from a real ticket.");
      return;
    }

    setInput("");

    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;

    const res = await fetch("/api/psychologist/chat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ sessionId, ticketId, message: text }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Send failed");
      return;
    }
    // no need to manually push, realtime will add it
  }

  if (loading) return <div className="p-6">Loading chat…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-4">
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <div>
              <h1 className="font-semibold">Conversation (User ↔ AI)</h1>
              <p className="text-sm text-gray-600">
                {sessionId ? (
                  <>
                    Session: <span className="font-mono text-xs">{sessionId}</span>
                  </>
                ) : (
                  "Open from a ticket to view a session."
                )}
              </p>
            </div>

            <button
              onClick={() => router.push("/psychologist")}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              Back
            </button>
          </div>

          <div className="p-4 h-[70vh] overflow-y-auto space-y-3">
            {msgs.map((m, idx) => {
              const isAI = m.role === "assistant" || m.role === "ai";
              const isUser = m.role === "user";
              const isPsy = m.role === "psychologist";

              return (
                <div key={m.id ?? idx} className={isUser ? "mr-auto" : "ml-auto"}>
                  <div className="text-[11px] text-gray-500 mb-1">
                    {labelForRole(m.role)}
                  </div>

                  <div
                    className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm border ${
                      isAI
                        ? "bg-gray-100 text-gray-900"
                        : isUser
                        ? "bg-blue-50 text-gray-900"
                        : isPsy
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Optional: allow psychologist reply */}
          <div className="p-4 border-t flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a reply as psychologist…"
              onKeyDown={(e) => e.key === "Enter" && sendAsPsychologist()}
            />
            <button
              onClick={sendAsPsychologist}
              className="rounded-xl bg-green-600 px-4 py-2 text-white text-sm"
              type="button"
            >
              Send
            </button>
          </div>

          {!sessionId ? (
            <div className="p-4 text-xs text-amber-700 bg-amber-50 border-t">
              Missing <b>sessionId</b>. Open chat using a real ticket link.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
