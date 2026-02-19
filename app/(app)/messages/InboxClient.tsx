"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = { id: string; full_name: string | null; username: string | null };

type ThreadRow = {
  conversation_id: string;
  created_at: string;
  partner: Profile | null;
  lastMessage: string;
  lastAt: string;
};

export default function InboxClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  // ✅ Always return something meaningful
  const displayName = (p: Profile | null) => {
    if (!p) return "User";
    const name = (p.full_name || "").trim();
    if (name) return name;
    if (p.username) return `@${p.username}`;
    if (p.id) return `User (${p.id.slice(0, 6)})`;
    return "User";
  };

  const displayHandle = (p: Profile | null) => {
    if (!p?.username) return "";
    return `@${p.username}`;
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

  /* ---------- LOAD INBOX ---------- */
  const loadInbox = useCallback(async () => {
    if (!meId) return;

    setLoading(true);

    // 1) all conversations I'm a member of
    const { data: mems, error: memErr } = await supabase
      .from("conversation_members")
      .select(
        `
        conversation_id,
        conversations:conversations (
          id,
          created_at
        )
      `
      )
      .eq("user_id", meId);

    if (memErr) {
      logErr("Inbox load memberships error:", memErr);
      setLoading(false);
      return;
    }

    const convoIds = (mems || []).map((m: any) => m.conversation_id).filter(Boolean);

    if (convoIds.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    // 2) find partner user in each conversation (DM expects 2 members)
    const { data: others, error: otherErr } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", convoIds)
      .neq("user_id", meId);

    if (otherErr) {
      logErr("Inbox load other members error:", otherErr);
      setLoading(false);
      return;
    }

    const partnerIds = Array.from(new Set((others || []).map((r: any) => r.user_id).filter(Boolean)));

    // 3) load partner profiles
    let profilesById: Record<string, Profile> = {};
    if (partnerIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", partnerIds);

      if (profErr) {
        // If you still see "User", this is usually RLS blocking
        logErr("Inbox load profiles error:", profErr, { partnerIds });
      } else {
        profilesById = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      }
    }

    // Map conversation -> partner profile (or fallback with id only)
    const partnerByConvo: Record<string, Profile | null> = {};
    (others || []).forEach((r: any) => {
      partnerByConvo[r.conversation_id] =
        profilesById[r.user_id] ?? { id: r.user_id, full_name: null, username: null };
    });

    // 4) last message per conversation
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: false })
      .limit(500);

    if (msgErr) logErr("Inbox load last messages error:", msgErr);

    const lastByConvo: Record<string, { body: string; created_at: string }> = {};
    (msgs || []).forEach((m: any) => {
      if (!lastByConvo[m.conversation_id]) {
        lastByConvo[m.conversation_id] = { body: m.body || "", created_at: m.created_at };
      }
    });

    // 5) build rows
    const rows: ThreadRow[] = (mems || []).map((m: any) => {
      const c = m.conversations;
      const cid = m.conversation_id;
      const last = lastByConvo[cid];

      return {
        conversation_id: cid,
        created_at: c?.created_at || new Date().toISOString(),
        partner: partnerByConvo[cid] ?? null,
        lastMessage: last?.body || "",
        lastAt: last?.created_at || c?.created_at || new Date().toISOString(),
      };
    });

    rows.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    setThreads(rows);
    setLoading(false);
  }, [supabase, meId]);

  useEffect(() => {
    if (meId) loadInbox();
  }, [meId, loadInbox]);

  /* ---------- REALTIME ---------- */
  useEffect(() => {
    if (!meId) return;

    const ch = supabase
      .channel(`realtime-inbox-${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadInbox();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, meId, loadInbox]);

  /* ---------- FILTER ---------- */
  const filtered = threads.filter((t) => {
    const name = displayName(t.partner).toLowerCase();
    const handle = displayHandle(t.partner).toLowerCase();
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return name.includes(q) || handle.includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white border rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>

            <div className="flex items-center gap-2">
              <Link
                href="/messages/new"
                className="text-sm bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700"
              >
                + New Chat
              </Link>

              <button
                onClick={() => loadInbox()}
                className="text-sm px-3 py-2 rounded-xl border hover:bg-gray-50"
                type="button"
              >
                Refresh
              </button>
            </div>
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
            <p className="text-gray-900 font-semibold">No conversations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start chatting: click <span className="font-medium">+ New Chat</span>
            </p>

            <div className="mt-4">
              <Link
                href="/messages/new"
                className="inline-flex text-sm bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700"
              >
                Start a New Chat
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => {
              const name = displayName(t.partner);
              const handle = displayHandle(t.partner);
              const initial = (name || "U").replace("@", "").slice(0, 1).toUpperCase();

              return (
                <button
                  key={t.conversation_id}
                  onClick={() => router.push(`/messages/${t.conversation_id}`)}
                  className="w-full text-left bg-white border rounded-2xl p-4 hover:bg-gray-50 transition"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                      {initial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{name}</p>
                          {handle && <p className="text-xs text-gray-500 truncate">{handle}</p>}
                        </div>

                        <span className="text-xs text-gray-500 shrink-0">{timeAgo(t.lastAt)}</span>
                      </div>

                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {t.lastMessage || "Say hi 👋"}
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
