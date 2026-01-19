"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function MessagesClient() {
  const { userId } = useParams<{ userId: string }>();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState("");

  /* ---------- AUTH + NAME ---------- */
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setMe(data.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      setName(profile?.full_name || "Chat");
    }
    load();
  }, [userId, supabase]);

  /* ---------- LOAD MESSAGES ---------- */
  useEffect(() => {
    if (!me) return;

    supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${me.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${me.id})`
      )
      .order("created_at")
      .then(({ data }) => setMessages(data || []));
  }, [me, userId, supabase]);

  async function sendMessage() {
    if (!text.trim()) return;

    await supabase.from("messages").insert({
      sender_id: me.id,
      receiver_id: userId,
      content: text,
    });

    setText("");
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b font-semibold">← {name}</div>

      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-2 ${
              m.sender_id === me.id ? "text-right" : "text-left"
            }`}
          >
            <span className="inline-block bg-gray-200 px-3 py-1 rounded">
              {m.content}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={sendMessage}
          className="bg-purple-600 text-white px-4 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
