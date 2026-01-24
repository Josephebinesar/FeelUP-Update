"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function MessagesClient() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const logErr = (label: string, err: any) => {
    const msg =
      (typeof err?.message === "string" && err.message) ||
      (typeof err === "string" && err) ||
      "Unknown error";
    const code =
      (typeof err?.code === "string" && err.code) ||
      (typeof err?.status === "number" ? String(err.status) : "");
    console.error(`${label} ${code ? `[${code}]` : ""} ${msg}`);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------- AUTH + PARTNER ---------- */
  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) logErr("Chat auth error:", error);

      if (!data.user) {
        router.replace("/login");
        return;
      }
      setMe(data.user);

      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .eq("id", userId)
        .maybeSingle();

      if (profErr) logErr("Chat partner profile error:", profErr);

      setPartner(profile || { id: userId, full_name: null, username: null });
    }

    load();
    return () => {
      mounted = false;
    };
  }, [userId, router, supabase]);

  /* ---------- LOAD MESSAGES ---------- */
  const loadMessages = useCallback(async () => {
    if (!me?.id) return;

    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at")
      .or(
        `and(sender_id.eq.${me.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${me.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      logErr("Chat load messages error:", error);
      return;
    }

    setMessages(data || []);
    setTimeout(scrollToBottom, 50);
  }, [supabase, me?.id, userId]);

  useEffect(() => {
    if (me?.id) loadMessages();
  }, [me?.id, loadMessages]);

  /* ---------- REALTIME ---------- */
  useEffect(() => {
    if (!me?.id) return;

    const ch = supabase
      .channel(`realtime-chat-${me.id}-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as any;

          const isThisChat =
            (m.sender_id === me.id && m.receiver_id === userId) ||
            (m.sender_id === userId && m.receiver_id === me.id);

          if (!isThisChat) return;

          setMessages((prev) => [...prev, m]);
          setTimeout(scrollToBottom, 20);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, me?.id, userId]);

  /* ---------- SEND ---------- */
  const sendMessage = async () => {
    if (!me?.id) return;
    const msg = text.trim();
    if (!msg) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      sender_id: me.id,
      receiver_id: userId,
      content: msg,
    });

    if (error) {
      logErr("Send message error:", error);
      setSending(false);
      return;
    }

    setText("");
    setSending(false);
    // realtime insert will add message to list
  };

  const displayName =
    partner?.full_name || partner?.username || "Chat";
  const handle = partner?.username ? `@${partner.username}` : "";

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/messages")}
            className="text-sm px-3 py-2 rounded-xl border hover:bg-gray-50"
            type="button"
          >
            ← Back
          </button>

          <div className="text-center">
            <div className="font-semibold text-gray-900">{displayName}</div>
            {handle && (
              <div className="text-xs text-gray-500">{handle}</div>
            )}
          </div>

          <button
            onClick={() => router.push(`/profile/${userId}`)}
            className="text-sm px-3 py-2 rounded-xl border hover:bg-gray-50"
            type="button"
          >
            View
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-2">
          {messages.length === 0 ? (
            <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">
              Say hi 👋
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === me?.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed border ${
                      mine
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-900"
                    }`}
                  >
                    {m.content}
                    <div
                      className={`mt-1 text-[10px] ${
                        mine ? "text-purple-100" : "text-gray-400"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 bg-white border-t">
        <div className="max-w-3xl mx-auto p-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            className="flex-1 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            className="px-5 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
