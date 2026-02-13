"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type TicketStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed";

type Ticket = {
  id: string;
  user_id: string;
  session_id: string;
  status: TicketStatus;
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

function severityLabel(sev: number) {
  if (sev >= 5) return "High";
  if (sev >= 3) return "Medium";
  return "Low";
}

function severityBadge(sev: number) {
  if (sev >= 5) return "border-rose-200 bg-rose-50 text-rose-900";
  if (sev >= 3) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

export default function PsychologistDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);

  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function guard() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;

    if (!user) {
      router.replace("/login");
      return null;
    }

    const email = user.email ?? "";
    const ok = email.toLowerCase().endsWith("@psychologist.feelup") || email.toLowerCase().endsWith("@admin.feelup");

    if (!ok) {
      router.replace(routeByEmail(email));
      return null;
    }

    setMe({ id: user.id, email });
    return user;
  }

  async function loadTickets(staffId: string) {
    setErr(null);

    const openRes = await supabase
      .from("escalation_tickets")
      .select("id,user_id,session_id,status,severity,assigned_psychologist_id,created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (openRes.error) {
      setErr(openRes.error.message);
      return;
    }

    const myRes = await supabase
      .from("escalation_tickets")
      .select("id,user_id,session_id,status,severity,assigned_psychologist_id,created_at")
      .eq("assigned_psychologist_id", staffId)
      .in("status", ["assigned", "in_progress"])
      .order("created_at", { ascending: false });

    if (myRes.error) {
      setErr(myRes.error.message);
      return;
    }

    setOpenTickets((openRes.data as Ticket[]) ?? []);
    setMyTickets((myRes.data as Ticket[]) ?? []);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const u = await guard();
      if (!u) return;

      await loadTickets(u.id);
      if (!mounted) return;
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickup(ticketId: string) {
    if (!me) return;
    if (!confirm("Pick up this ticket and assign it to you?")) return;

    const upd = await supabase.from("escalation_tickets").update({ status: "assigned", assigned_psychologist_id: me.id }).eq("id", ticketId);

    if (upd.error) {
      alert(upd.error.message);
      return;
    }

    const busy = await supabase.from("psychologists").update({ is_available: false }).eq("user_id", me.id);
    if (busy.error) console.warn("Failed to set psychologist unavailable:", busy.error.message);

    await loadTickets(me.id);
  }

  async function endTicket(ticketId: string) {
    if (!me) return;
    if (!confirm("End this conversation (resolve ticket)?")) return;

    const { data: auth } = await supabase.auth.getSession();
    const token = auth.session?.access_token ?? null;

    const res = await fetch("/api/support/end-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ticketId }),
    });

    const j = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      alert(j?.error || "Failed to end ticket");
      return;
    }

    const free = await supabase.from("psychologists").update({ is_available: true }).eq("user_id", me.id);
    if (free.error) console.warn("Failed to set psychologist available:", free.error.message);

    await loadTickets(me.id);
  }

  function openChat(ticket: Ticket) {
    router.push(`/psychologist/chat?ticketId=${encodeURIComponent(ticket.id)}&sessionId=${encodeURIComponent(ticket.session_id)}`);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-6 text-slate-700">Loading psychologist…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">Psychologist Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Logged in as <b className="text-slate-900">{me?.email}</b>
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
            type="button"
          >
            Sign out
          </button>
        </div>

        {err ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{err}</div>
        ) : null}

        {/* Open tickets */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Open tickets</h2>
              <p className="text-xs text-slate-500 mt-1">Pick up tickets to work on them. You can also open chat.</p>
            </div>

            <button
              onClick={() => me && loadTickets(me.id)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {openTickets.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No open tickets right now.
              </div>
            ) : (
              openTickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      Ticket: <span className="font-mono font-medium">{t.id.slice(0, 8)}…</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full border px-3 py-1 ${severityBadge(t.severity)}`}>
                        Severity: <b>{t.severity}</b> ({severityLabel(t.severity)})
                      </span>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                        Created: <b className="text-slate-900">{new Date(t.created_at).toLocaleString()}</b>
                      </span>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                        Session: <span className="font-mono">{t.session_id.slice(0, 10)}…</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => pickup(t.id)}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
                      type="button"
                    >
                      Pick up
                    </button>

                    <button
                      onClick={() => openChat(t)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
                      type="button"
                    >
                      Open chat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My tickets */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-slate-900">My tickets</h2>
            <p className="text-xs text-slate-500 mt-1">Assigned and in-progress tickets.</p>
          </div>

          <div className="mt-5 space-y-3">
            {myTickets.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No assigned tickets.
              </div>
            ) : (
              myTickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      Ticket: <span className="font-mono font-medium">{t.id.slice(0, 8)}…</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                        Status: <b className="text-slate-900">{t.status}</b>
                      </span>

                      <span className={`rounded-full border px-3 py-1 ${severityBadge(t.severity)}`}>
                        Severity: <b>{t.severity}</b> ({severityLabel(t.severity)})
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openChat(t)}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 active:scale-[0.99]"
                      type="button"
                    >
                      Open chat
                    </button>

                    <button
                      onClick={() => endTicket(t.id)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
                      type="button"
                    >
                      End
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Ending a ticket sets status to <b>resolved</b> and resumes the user’s AI Buddy.
          </div>
        </div>
      </div>
    </div>
  );
}
