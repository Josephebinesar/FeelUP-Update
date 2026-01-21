"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type ChatRow = {
  partner: Profile;
  lastMessage: string;
  lastAt: string;
};

export default function InboxClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  /* ---------- AUTH ---------- */
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;

      if (error) logErr("Inbox auth error:", error);

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setMeId(data.user.id);
    });

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* ---------- LOAD INBOX (latest message per partner) ---------- */
  const loadInbox = useCallback(async () => {
    if (!meId) return;

    setLoading(true);

    // Get recent messages involving me (limit to keep it fast)
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at")
      .or(`sender_id.eq.${meId},receiver_id.eq.${meId}`)
      .order("created_at", { ascending: false })
      .limit(400);

    if (msgErr) {
      logErr("Inbox load messages error:", msgErr);
      setLoading(false);
      return;
    }

    const messages = msgs || [];

    // Build map partnerId -> latest message
    const latestByPartner = new Map<
      string,
      { lastMessage: string; lastAt: string }
    >();

    for (const m of messages) {
      const partnerId = m.sender_id === meId ? m.receiver_id : m.sender_id;
      if (!partnerId) continue;

      if (!latestByPartner.has(partnerId)) {
        latestByPartner.set(partnerId, {
          lastMessage: m.content || "",
          lastAt: m.created_at,
        });
      }
    }

    const partnerIds = Array.from(latestByPartner.keys());
    if (partnerIds.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Load partner profiles
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", partnerIds);

    if (profErr) {
      logErr("Inbox load profiles error:", profErr);
      setLoading(false);
      return;
    }

    const byId: Record<string, Profile> = {};
    (profiles || []).forEach((p) => (byId[p.id] = p));

    const rows: ChatRow[] = partnerIds
      .map((pid) => ({
        partner: byId[pid] || { id: pid, full_name: null, username: null },
        lastMessage: latestByPartner.get(pid)!.lastMessage,
        lastAt: latestByPartner.get(pid)!.lastAt,
      }))
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    setChats(rows);
    setLoading(false);
  }, [supabase, meId]);

  useEffect(() => {
    if (meId) loadInbox();
  }, [meId, loadInbox]);

  /* ---------- REALTIME: when any message insert involves me, refresh inbox ---------- */
  useEffect(() => {
    if (!meId) return;

    const ch = supabase
      .channel(`realtime-inbox-${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as any;
          if (m.sender_id === meId || m.receiver_id === meId) {
            loadInbox();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, meId, loadInbox]);

  const filtered = chats.filter((c) => {
    const name = `${c.partner.full_name || ""} ${c.partner.username || ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white border rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={() => loadInbox()}
              className="text-sm px-3 py-2 rounded-xl border hover:bg-gray-50"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4">
            <input
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">
            Loading chats…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center">
            <p className="text-gray-700 font-semibold">No conversations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Go to Explore and message someone.
            </p>
            <button
              onClick={() => router.push("/explore")}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700"
              type="button"
            >
              Go to Explore
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const name =
                c.partner.full_name || c.partner.username || "User";
              const handle = c.partner.username ? `@${c.partner.username}` : "";
              const initial = (name || "U").slice(0, 1).toUpperCase();

              return (
                <button
                  key={c.partner.id}
                  onClick={() => router.push(`/messages/${c.partner.id}`)}
                  className="w-full text-left bg-white border rounded-2xl p-4 hover:bg-gray-50 transition"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                      {initial}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {name}
                          </p>
                          {handle && (
                            <p className="text-xs text-gray-500 truncate">
                              {handle}
                            </p>
                          )}
                        </div>

                        <span className="text-xs text-gray-500 shrink-0">
                          {timeAgo(c.lastAt)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {c.lastMessage || "—"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
