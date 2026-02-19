"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

function getConversationIdFromRpc(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data; // uuid returned directly
  if (typeof data === "object") {
    // common patterns
    return (
      data.conversation_id ||
      data.id ||
      data.conversationId ||
      data.data?.conversation_id ||
      null
    );
  }
  return null;
}

export default function NewChatPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Profile[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const searchUsers = async () => {
    const query = q.trim();
    if (query.length < 2) {
      setList([]);
      setErr("Type at least 2 characters");
      return;
    }

    setErr(null);
    setLoading(true);

    const res = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(20);

    setLoading(false);

    if (res.error) {
      setErr(res.error.message);
      setList([]);
      return;
    }

    setList((res.data || []) as Profile[]);
  };

  const connectToUser = async (otherUserId: string) => {
    const { data, error } = await supabase.rpc("connect_to_user", {
      other_user_id: otherUserId,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const conversationId = getConversationIdFromRpc(data);

    if (!conversationId) {
      alert("connect_to_user RPC did not return a conversation id. Check console.");
      console.log("connect_to_user returned:", data);
      return;
    }

    router.push(`/messages/${conversationId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white border rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold text-gray-900">New Chat</h1>
            <button
              onClick={() => router.push("/messages")}
              className="text-sm border px-3 py-1.5 rounded-xl hover:bg-gray-50"
              type="button"
            >
              Back
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search username or name…"
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={searchUsers}
              disabled={loading}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl disabled:opacity-50"
              type="button"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

          <div className="mt-4 space-y-2">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => connectToUser(p.id)}
                className="w-full text-left bg-white border rounded-xl p-3 hover:bg-gray-50"
                type="button"
              >
                <div className="text-sm font-medium text-gray-900">
                  {p.full_name || "Unknown"}
                </div>
                <div className="text-xs text-gray-500">
                  @{p.username || "no-username"}
                </div>
              </button>
            ))}

            {!loading && list.length === 0 && q.trim().length >= 2 && !err && (
              <div className="text-sm text-gray-500">No users found.</div>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Tip: Add usernames in your profiles table so search works nicely.
          </div>
        </div>
      </div>
    </div>
  );
}
