import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function supabaseAnonWithBearer(accessToken: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, anon, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, service, { auth: { persistSession: false } });
}

/**
 * ✅ Ensure a chat_session row exists so chat_messages FK won't fail later.
 * Works even if called multiple times.
 */
async function ensureChatSessionAdmin(opts: { admin: any; sessionId: string; userId: string }) {
  const { admin, sessionId, userId } = opts;

  // If your chat_sessions has extra NOT NULL columns, add them here.
  // Minimal common schema: id (uuid pk), user_id (uuid), created_at default now()
  const existing = await admin.from("chat_sessions").select("id").eq("id", sessionId).maybeSingle();

  if (existing.error) return { ok: false, step: "select_chat_session", error: existing.error };

  if (existing.data?.id) return { ok: true, created: false };

  const ins = await admin.from("chat_sessions").insert({
    id: sessionId,
    user_id: userId,
  });

  if (ins.error) return { ok: false, step: "insert_chat_session", error: ins.error };

  return { ok: true, created: true };
}

async function ensureTicketAdmin(opts: {
  admin: any;
  userId: string;
  sessionId: string;
  severity: number;
  summary: string;
}) {
  const { admin, userId, sessionId, severity, summary } = opts;

  // ✅ don't create duplicates for active tickets
  const existing = await admin
    .from("escalation_tickets")
    .select("id,status")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .in("status", ["open", "assigned", "in_progress"])
    .limit(1);

  if (existing.error) return { ok: false, step: "select_existing", error: existing.error };

  if (existing.data?.length) {
    return { ok: true, ticketId: existing.data[0].id, created: false };
  }

  const ins = await admin.from("escalation_tickets").insert({
    user_id: userId,
    session_id: sessionId,
    severity,
    severity_score: severity,
    summary,
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
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized", details: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const supabase = supabaseAnonWithBearer(accessToken);
    const admin = supabaseAdmin();

    // ✅ must be logged in user
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) {
      return NextResponse.json(
        { error: "Unauthorized", details: uErr?.message ?? "No user" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({} as any));

    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const severityRaw = body?.severity;
    const severity =
      typeof severityRaw === "number" && Number.isFinite(severityRaw)
        ? Math.max(0, Math.min(5, Math.round(severityRaw)))
        : 5;

    const summary =
      typeof body?.summary === "string" && body.summary.trim()
        ? body.summary.trim().slice(0, 500)
        : `Escalation triggered by AI Buddy (severity ${severity}).`;

    // ✅ IMPORTANT: ensure chat_session exists (FK safety)
    const s = await ensureChatSessionAdmin({ admin, sessionId, userId: u.user.id });
    if (!s.ok) {
      return NextResponse.json(
        {
          error: "Chat session ensure failed",
          step: (s as any).step,
          details: (s as any).error?.message ?? String((s as any).error),
        },
        { status: 500 }
      );
    }

    // ✅ ticket create (or reuse existing active ticket)
    const t = await ensureTicketAdmin({
      admin,
      userId: u.user.id,
      sessionId,
      severity,
      summary,
    });

    if (!t.ok) {
      return NextResponse.json(
        {
          error: "Ticket create failed",
          step: (t as any).step,
          details: (t as any).error?.message ?? String((t as any).error),
        },
        { status: 500 }
      );
    }

    if (!t.ticketId) {
      return NextResponse.json(
        { error: "Ticket create failed", details: "No ticketId returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      ticketId: t.ticketId,
      created: t.created,
      sessionId,
      ensuredSession: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
