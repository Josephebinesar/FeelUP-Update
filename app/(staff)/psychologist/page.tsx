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
    const ok =
      email.toLowerCase().endsWith("@psychologist.feelup") ||
      email.toLowerCase().endsWith("@admin.feelup");

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

    const upd = await supabase
      .from("escalation_tickets")
      .update({ status: "assigned", assigned_psychologist_id: me.id })
      .eq("id", ticketId);

    if (upd.error) {
      alert(upd.error.message);
      return;
    }

    // set psychologist unavailable while working
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

    // set psychologist available again
    const free = await supabase.from("psychologists").update({ is_available: true }).eq("user_id", me.id);
    if (free.error) console.warn("Failed to set psychologist available:", free.error.message);

    await loadTickets(me.id);
  }

  function openChat(ticket: Ticket) {
    router.push(
      `/psychologist/chat?ticketId=${encodeURIComponent(ticket.id)}&sessionId=${encodeURIComponent(ticket.session_id)}`
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <div className="p-6">Loading psychologist…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Psychologist Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as <b>{me?.email}</b>
            </p>
          </div>

          <button onClick={logout} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" type="button">
            Sign out
          </button>
        </div>

        {err ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{err}</div>
        ) : null}

        {/* Open tickets */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Open tickets</h2>
            <button
              onClick={() => me && loadTickets(me.id)}
              className="text-sm border rounded-xl px-3 py-2 hover:bg-gray-50"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {openTickets.length === 0 ? (
              <div className="text-sm text-gray-500">No open tickets right now.</div>
            ) : (
              openTickets.map((t) => (
                <div key={t.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      Ticket: <span className="font-mono">{t.id.slice(0, 8)}…</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Severity: <b>{t.severity}</b> ({severityLabel(t.severity)}) •{" "}
                      {new Date(t.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Session: <span className="font-mono">{t.session_id.slice(0, 10)}…</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => pickup(t.id)}
                      className="text-sm rounded-xl bg-green-600 text-white px-4 py-2 hover:bg-green-700"
                      type="button"
                    >
                      Pick up
                    </button>
                    <button
                      onClick={() => openChat(t)}
                      className="text-sm rounded-xl border px-4 py-2 hover:bg-gray-50"
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

        {/* My assigned / in progress */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold">My tickets</h2>

          <div className="mt-4 space-y-2">
            {myTickets.length === 0 ? (
              <div className="text-sm text-gray-500">No assigned tickets.</div>
            ) : (
              myTickets.map((t) => (
                <div key={t.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      Ticket: <span className="font-mono">{t.id.slice(0, 8)}…</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: <b>{t.status}</b> • Severity: <b>{t.severity}</b> ({severityLabel(t.severity)})
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openChat(t)}
                      className="text-sm rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
                      type="button"
                    >
                      Open chat
                    </button>

                    <button
                      onClick={() => endTicket(t.id)}
                      className="text-sm rounded-xl border px-4 py-2 hover:bg-gray-50"
                      type="button"
                    >
                      End
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Ending a ticket sets status to <b>resolved</b> and resumes the user’s AI Buddy.
          </div>
        </div>
      </div>
    </div>
  );
}
