"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = { id: string; full_name: string | null; username: string | null };

export default function MessagesClient() {
  // ✅ support both [id] and [Id]
  const params = useParams() as Record<string, string | string[] | undefined>;
  const idRaw = params.id ?? params.Id; // <-- IMPORTANT FIX
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const logErr = (label: string, err: any, extra?: any) => {
    const msg =
      (typeof err?.message === "string" && err.message) ||
      (typeof err === "string" && err) ||
      "Unknown error";
    const code =
      (typeof err?.code === "string" && err.code) ||
      (typeof err?.status === "number" ? String(err.status) : "");
    console.error(`${label} ${code ? `[${code}]` : ""} ${msg}`);
    if (extra !== undefined) console.error(label, "extra:", extra);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  // ✅ Guard: if route param is missing, don’t query with undefined
  useEffect(() => {
    if (!id || id === "undefined") {
      console.error("Route param missing. Expected /messages/<conversationId>. Got:", id);
      router.replace("/messages");
    }
  }, [id, router]);

  /* ---------- AUTH + PARTNER ---------- */
  useEffect(() => {
    let mounted = true;
    if (!id || id === "undefined") return;

    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) logErr("Chat auth error:", error);

      if (!data.user) {
        router.replace("/login");
        return;
      }
      setMe(data.user);

      // ensure I'm in this conversation
      const { data: mem, error: memErr } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", id)
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (memErr) {
        logErr("Chat membership check error:", memErr);
        router.replace("/messages");
        return;
      }

      if (!mem) {
        router.replace("/messages");
        return;
      }

      // get partner id
      const { data: otherMem, error: otherErr } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", id)
        .neq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();

      if (otherErr) logErr("Partner member error:", otherErr);

      const partnerId = otherMem?.user_id;
      if (!partnerId) {
        setPartner(null);
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .eq("id", partnerId)
        .maybeSingle();

      if (profErr) logErr("Partner profile error:", profErr);

      setPartner((prof as any) || { id: partnerId, full_name: null, username: null });
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, router, supabase]);

  /* ---------- LOAD MESSAGES ---------- */
  const loadMessages = useCallback(async () => {
    if (!me?.id || !id || id === "undefined") return;

    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      logErr("Chat load messages error:", error);
      return;
    }

    setMessages(data || []);
    setTimeout(scrollToBottom, 50);
  }, [supabase, me?.id, id]);

  useEffect(() => {
    if (me?.id && id && id !== "undefined") loadMessages();
  }, [me?.id, id, loadMessages]);

  /* ---------- REALTIME ---------- */
  useEffect(() => {
    if (!me?.id || !id || id === "undefined") return;

    const ch = supabase
      .channel(`realtime-chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) => [...prev, m]);
          setTimeout(scrollToBottom, 20);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, me?.id, id]);

  /* ---------- SEND ---------- */
  const sendMessage = async () => {
    if (!me?.id || !id || id === "undefined") return;

    const msg = text.trim();
    if (!msg) return;

    setSending(true);
    setText("");

   const { error } = await supabase.from("messages").insert({
  conversation_id: id,
  sender_id: me.id,
  body: msg,
});


    if (error) {
      logErr("Send message error:", error);
      setText(msg);
      setSending(false);
      return;
    }

    setSending(false);
  };

  const displayName = partner?.full_name || partner?.username || "Chat";
  const handle = partner?.username ? `@${partner.username}` : "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
            {handle && <div className="text-xs text-gray-500">{handle}</div>}
          </div>

          <button
            onClick={() => partner?.id && router.push(`/profile/${partner.id}`)}
            className="text-sm px-3 py-2 rounded-xl border hover:bg-gray-50"
            type="button"
          >
            View
          </button>
        </div>
      </div>

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
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed border ${
                      mine ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-900"
                    }`}
                  >
                    {m.body}
                    <div className={`mt-1 text-[10px] ${mine ? "text-purple-100" : "text-gray-400"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

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
