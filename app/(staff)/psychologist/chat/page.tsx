"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { SendHorizontal } from "lucide-react";

type Msg = { id?: string; role: "user" | "assistant"; content: string; created_at: string };

type TicketRow = {
  id: string;
  user_id: string;
  session_id: string;
  status: "open" | "assigned" | "in_progress" | "resolved" | "closed";
  severity: number;
  assigned_psychologist_id: string | null;
  created_at: string;
};

function routeByEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "/admin";
  if (e.endsWith("@psychologist.feelup")) return "/psychologist";
  return "/mood-feed";
}

export default function PsychologistChatPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const sp = useSearchParams();
  const router = useRouter();

  const ticketId = sp.get("ticketId") || "";
  const sessionId = sp.get("sessionId") || "";

  const [loading, setLoading] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [meId, setMeId] = useState<string>("");
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [ticketUserId, setTicketUserId] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function reloadTicket() {
    const tRes = await supabase
      .from("escalation_tickets")
      .select("id,user_id,session_id,status,severity,assigned_psychologist_id,created_at")
      .eq("id", ticketId)
      .single();

    if (!tRes.error && tRes.data) {
      setTicket(tRes.data as any);
      setTicketUserId((tRes.data as any).user_id);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!ticketId || !sessionId) {
        setErr("Missing ticketId/sessionId. Open chat from dashboard.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      if (!user) {
        router.replace("/login");
        return;
      }

      const email = user.email ?? "";
      const ok =
        email.toLowerCase().endsWith("@psychologist.feelup") ||
        email.toLowerCase().endsWith("@admin.feelup");

      if (!ok) {
        router.replace(routeByEmail(email));
        return;
      }

      setMeId(user.id);

      await reloadTicket();

      // If I'm assigned and ticket is assigned, mark in_progress when I open chat
      const tNow = await supabase
        .from("escalation_tickets")
        .select("id,status,assigned_psychologist_id")
        .eq("id", ticketId)
        .single();

      if (
        !tNow.error &&
        tNow.data &&
        tNow.data.assigned_psychologist_id === user.id &&
        tNow.data.status === "assigned"
      ) {
        await supabase.from("escalation_tickets").update({ status: "in_progress" }).eq("id", ticketId);
        await reloadTicket();
      }

      const res = await supabase
        .from("chat_messages")
        .select("id,role,content,created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (res.error) {
        setErr(res.error.message);
        setLoading(false);
        return;
      }

      if (!mounted) return;
      setMsgs((res.data as Msg[]) ?? []);
      setLoading(false);

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

      // also watch ticket status changes (optional but helpful)
      const ch2 = supabase
        .channel(`psy-ticket-${ticketId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "escalation_tickets", filter: `id=eq.${ticketId}` },
          (payload) => {
            const row = payload.new as any;
            setTicket((prev) => (prev ? { ...prev, ...row } : row));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ch);
        supabase.removeChannel(ch2);
      };
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, sessionId]);

  async function pickup() {
    if (!ticketId || !meId) return;

    const upd = await supabase
      .from("escalation_tickets")
      .update({ status: "assigned", assigned_psychologist_id: meId })
      .eq("id", ticketId);

    if (upd.error) {
      alert(upd.error.message);
      return;
    }

    await supabase.from("psychologists").update({ is_available: false }).eq("user_id", meId);
    await reloadTicket();
  }

  async function endConversation() {
    if (!ticketId || !meId) return;
    if (!confirm("End this conversation? The user’s AI Buddy will resume normally.")) return;

    const upd = await supabase.from("escalation_tickets").update({ status: "resolved" }).eq("id", ticketId);
    if (upd.error) {
      alert(upd.error.message);
      return;
    }

    const free = await supabase.from("psychologists").update({ is_available: true }).eq("user_id", meId);
    if (free.error) console.warn("Failed to set psychologist available:", free.error.message);

    // Optional: add closing message for the user
    if (ticketUserId) {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        user_id: ticketUserId,
        role: "assistant",
        content: "Session ended",
      });
    }

    await reloadTicket();
  }

  async function sendReply() {
    if (ticket?.status === "resolved") {
      alert("This session is ended.");
      return;
    }

    const text = input.trim();
    if (!text) return;

    if (!ticketUserId) {
      alert("Ticket user_id not loaded yet.");
      return;
    }

    setInput("");

    const ins = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: ticketUserId,
      role: "assistant",
      content: text,
    });

    if (ins.error) {
      alert(ins.error.message);
    }
  }

  if (loading) return <div className="p-6">Loading chat…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-4">
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-semibold">Psychologist Chat</h1>
              <p className="text-xs text-gray-500">
                Session: <span className="font-mono">{sessionId}</span>
              </p>

              {ticket ? (
                <p className="mt-1 text-xs text-gray-500">
                  Status: <b>{ticket.status}</b> • Severity: <b>{ticket.severity}</b> • Assigned:{" "}
                  <b>{ticket.assigned_psychologist_id ? "Yes" : "No"}</b>
                </p>
              ) : null}
            </div>

            <div className="flex gap-2 flex-wrap justify-end">
              {ticket && ticket.status === "open" ? (
                <button
                  onClick={pickup}
                  className="rounded-xl bg-green-600 text-white px-3 py-2 text-sm hover:bg-green-700"
                  type="button"
                >
                  Assign to me
                </button>
              ) : null}

              {ticket && (ticket.status === "assigned" || ticket.status === "in_progress") ? (
                <button
                  onClick={endConversation}
                  className="rounded-xl bg-red-600 text-white px-3 py-2 text-sm hover:bg-red-700"
                  type="button"
                >
                  End conversation
                </button>
              ) : null}

              <button
                onClick={() => router.push("/psychologist")}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                type="button"
              >
                Back
              </button>
            </div>
          </div>

          {ticket?.status === "resolved" ? (
            <div className="m-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              This conversation is ended. The user’s AI Buddy will resume normally.
            </div>
          ) : null}

          {err ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{err}</div>
          ) : null}

          <div className="p-4 h-[70vh] overflow-y-auto space-y-3">
            {msgs.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id ?? idx} className={isUser ? "mr-auto" : "ml-auto"}>
                  <div
                    className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm border ${
                      isUser ? "bg-blue-50 text-gray-900" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {m.content}
                    <div className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ticket?.status === "resolved" ? "Session ended" : "Reply as psychologist…"}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              disabled={ticket?.status === "resolved"}
            />
            <button
              onClick={sendReply}
              className="rounded-xl bg-green-600 px-4 py-2 text-white text-sm inline-flex items-center gap-2 disabled:opacity-60"
              type="button"
              disabled={ticket?.status === "resolved"}
            >
              <SendHorizontal className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
