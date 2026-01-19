"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

export default function InboxClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);

  /* ---------- AUTH ---------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(data.user.id);
    });
  }, [router, supabase]);

  /* ---------- LOAD INBOX ---------- */
  useEffect(() => {
    if (!currentUserId) return;

    async function loadInbox() {
      // 1. Messages involving me
      const { data: messages } = await supabase
        .from("messages")
        .select("sender_id, receiver_id");

      if (!messages) return;

      // 2. Unique chat partner IDs
      const ids = new Set<string>();
      messages.forEach((m) => {
        if (m.sender_id === currentUserId) ids.add(m.receiver_id);
        if (m.receiver_id === currentUserId) ids.add(m.sender_id);
      });

      // 3. Load profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", Array.from(ids));

      setUsers(profiles || []);
    }

    loadInbox();
  }, [currentUserId, supabase]);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {users.map((u) => (
        <div
          key={u.id}
          onClick={() => router.push(`/messages/${u.id}`)}
          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
        >
          <p className="font-semibold">
            {u.full_name || u.username || "User"}
          </p>
        </div>
      ))}
    </div>
  );
}
