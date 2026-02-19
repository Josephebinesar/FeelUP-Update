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

function statusBadgeClasses(status?: TicketRow["status"]) {
  switch (status) {
    case "open":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "assigned":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "in_progress":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "resolved":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "closed":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
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
        email.toLowerCase().endsWith("@psychologist.feelup") || email.toLowerCase().endsWith("@admin.feelup");

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

      if (!tNow.error && tNow.data && tNow.data.assigned_psychologist_id === user.id && tNow.data.status === "assigned") {
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

      // also watch ticket status changes
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

    const upd = await supabase.from("escalation_tickets").update({ status: "assigned", assigned_psychologist_id: meId }).eq("id", ticketId);

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

  if (loading) return <div className="min-h-screen bg-slate-50 p-6 text-slate-700">Loading chat…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center text-sm font-semibold">
                    PSY
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold text-slate-900">Psychologist Chat</h1>
                    <p className="text-xs text-slate-500">
                      Session: <span className="font-mono">{sessionId}</span>
                    </p>
                  </div>
                </div>

                {ticket ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${statusBadgeClasses(ticket.status)}`}>
                      Status: <b>{ticket.status}</b>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                      Severity: <b className="text-slate-900">{ticket.severity}</b>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                      Assigned: <b className="text-slate-900">{ticket.assigned_psychologist_id ? "Yes" : "No"}</b>
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {ticket && ticket.status === "open" ? (
                  <button
                    onClick={pickup}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
                    type="button"
                  >
                    Assign to me
                  </button>
                ) : null}

                {ticket && (ticket.status === "assigned" || ticket.status === "in_progress") ? (
                  <button
                    onClick={endConversation}
                    className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 active:scale-[0.99]"
                    type="button"
                  >
                    End conversation
                  </button>
                ) : null}

                <button
                  onClick={() => router.push("/psychologist")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
                  type="button"
                >
                  Back
                </button>
              </div>
            </div>
          </div>

          {/* Notices */}
          {ticket?.status === "resolved" ? (
            <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-medium">Conversation ended</div>
              <div className="mt-1 text-emerald-800/80">The user’s AI Buddy will resume normally.</div>
            </div>
          ) : null}

          {err ? (
            <div className="mx-5 mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          {/* Messages */}
          <div className="px-5 py-5 h-[70vh] overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 to-white">
            <div className="space-y-3">
              {msgs.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id ?? idx} className={isUser ? "flex justify-start" : "flex justify-end"}>
                    <div className="max-w-[92%]">
                      <div
                        className={[
                          "rounded-3xl px-4 py-3 text-sm shadow-sm border whitespace-pre-wrap",
                          isUser ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-900 text-white",
                        ].join(" ")}
                      >
                        {m.content}
                      </div>
                      <div className={isUser ? "pl-2" : "pr-2 text-right"}>
                        <span className="mt-1 inline-block text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:bg-slate-50"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ticket?.status === "resolved" ? "Session ended" : "Reply as psychologist…"}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  disabled={ticket?.status === "resolved"}
                />
                <div className="mt-2 text-[11px] text-slate-500">
                  Tip: Press <b>Enter</b> to send.
                </div>
              </div>

              <button
                onClick={sendReply}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-white text-sm font-medium inline-flex items-center gap-2 shadow-sm hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
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
    </div>
  );
}
