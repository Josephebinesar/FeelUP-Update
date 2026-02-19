import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

const WORKER_URL = process.env.FEELUP_SUPPORT_WORKER_URL!;

function supabaseAnonWithBearer(accessToken: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service, { auth: { persistSession: false } });
}

type Body = { sessionId?: string; message?: string };
type MsgRow = { role: "user" | "assistant"; content: string; created_at: string };

async function ensureChatSession(admin: any, sessionId: string, userId: string) {
  return admin.from("chat_sessions").upsert({ id: sessionId, user_id: userId }, { onConflict: "id" });
}

async function ensureTicketAdmin(opts: { admin: any; userId: string; sessionId: string; severity: number }) {
  const { admin, userId, sessionId, severity } = opts;

  const existing = await admin
    .from("escalation_tickets")
    .select("id,status")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .in("status", ["open", "assigned", "in_progress"])
    .limit(1);

  if (existing.error) return { ok: false, step: "select_existing", error: existing.error };
  if (existing.data?.length) return { ok: true, ticketId: existing.data[0].id, created: false };

  const ins = await admin.from("escalation_tickets").insert({
    user_id: userId,
    session_id: sessionId,
    severity,
    severity_score: severity,
    summary: `Escalation triggered by AI Buddy (severity ${severity}).`,
    status: "open",
    assigned_psychologist_id: null,
  });

  if (ins.error) return { ok: false, step: "insert_ticket", error: ins.error };

  const latest = await admin
    .from("escalation_tickets")
    .select("id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (latest.error) return { ok: false, step: "select_latest", error: latest.error };
  return { ok: true, ticketId: latest.data?.[0]?.id ?? null, created: true };
}

export async function POST(req: Request) {
  try {
    if (!WORKER_URL) {
      return NextResponse.json({ error: "Missing FEELUP_SUPPORT_WORKER_URL" }, { status: 500 });
    }

    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = supabaseAnonWithBearer(accessToken);
    const admin = supabaseAdmin();

    // ✅ require login (your DB uses user_id + RLS)
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) {
      return NextResponse.json({ error: "Unauthorized", details: uErr?.message ?? "No user session" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const message = (body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

    const sessionId = body.sessionId || crypto.randomUUID();

    // ✅ FIX: ensure chat_sessions row exists so FK never fails
    const sesUp = await ensureChatSession(admin, sessionId, u.user.id);
    if (sesUp.error) {
      return NextResponse.json({ error: "Session upsert failed", details: sesUp.error }, { status: 500 });
    }

    // Load last 20 messages for context
    const { data: history, error: hErr } = await admin
      .from("chat_messages")
      .select("role,content,created_at")
      .eq("session_id", sessionId)
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const safeHistory: Array<{ role: "user" | "assistant"; content: string }> =
      !hErr && Array.isArray(history)
        ? (history as MsgRow[])
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content }))
        : [];

    // Call Worker
    const workerRes = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, userId: u.user.id, message, history: safeHistory }),
    });

    const workerJson = await workerRes.json().catch(() => ({}));
    if (!workerRes.ok) {
      return NextResponse.json({ error: "Worker error", details: workerJson }, { status: 500 });
    }

    const reply = String(workerJson.reply || "");
    const severity = typeof workerJson.severity === "number" ? workerJson.severity : null;
    const escalated = Boolean(workerJson.escalated);
    const plan = Array.isArray(workerJson.plan) ? workerJson.plan : [];
    const tasks = Array.isArray(workerJson.tasks) ? workerJson.tasks : [];

    // Save both messages
    const insMsgs = await admin.from("chat_messages").insert([
      { session_id: sessionId, user_id: u.user.id, role: "user", content: message },
      { session_id: sessionId, user_id: u.user.id, role: "assistant", content: reply },
    ]);

    if (insMsgs.error) {
      return NextResponse.json({ error: "DB insert failed", details: insMsgs.error }, { status: 500 });
    }

    // Ticket creation if escalated
    let ticketId: string | null = null;
    let ticketDebug: any = null;

    if (escalated && typeof severity === "number") {
      const t = await ensureTicketAdmin({ admin, userId: u.user.id, sessionId, severity });
      if (!t.ok) ticketDebug = { step: (t as any).step, ticket_error: (t as any).error?.message ?? String((t as any).error) };
      else {
        ticketId = t.ticketId ?? null;
        ticketDebug = { created: t.created, ticketId };
      }
    }

    return NextResponse.json({ sessionId, reply, severity, escalated, plan, tasks, ticketId, ticketDebug });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
