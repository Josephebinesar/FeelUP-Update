"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

export default function ChatBox({ otherUserId }: { otherUserId: string }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  /* -------- Get logged-in Supabase user -------- */
  useEffect(() => {
    //.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  /* -------- Fetch messages -------- */
  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    async function loadMessages() {
      setLoading(true);

      const res = await fetch(
        `/api/messages?userId=${currentUserId}&otherUserId=${otherUserId}`
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        console.error("Messages API returned:", data);
        setMessages([]);
      }

      setLoading(false);
    }

    loadMessages();
  }, [currentUserId, otherUserId]);

  /* -------- Send message -------- */
  async function sendMessage() {
    if (!text.trim() || !currentUserId) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: text,
      }),
    });

    setText("");

    // reload messages
    const res = await fetch(
      `/api/messages?userId=${currentUserId}&otherUserId=${otherUserId}`
    );
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  }

  return (
    <div className="border rounded p-4 max-w-md mx-auto">
      <div className="h-64 overflow-y-auto mb-4 space-y-2">
        {loading && <p className="text-gray-500">Loading...</p>}

        {!loading && messages.length === 0 && (
          <p className="text-gray-500">No messages yet</p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded max-w-[80%] ${
              msg.sender_id === currentUserId
                ? "bg-purple-600 text-white ml-auto text-right"
                : "bg-gray-200"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
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
