import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized", details: "Missing Authorization header" }, { status: 401 });
    }

    const supabase = supabaseAnonWithBearer(accessToken);
    const admin = supabaseAdmin();

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) {
      return NextResponse.json({ error: "Unauthorized", details: uErr?.message ?? "No user" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const ticketId = typeof body?.ticketId === "string" ? body.ticketId : "";
    if (!ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });

    const tRes = await admin
      .from("escalation_tickets")
      .select("id,status,assigned_psychologist_id,session_id,severity")
      .eq("id", ticketId)
      .maybeSingle();

    if (tRes.error) {
      return NextResponse.json({ error: "Ticket read failed", details: tRes.error.message }, { status: 500 });
    }
    if (!tRes.data) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({
      ticketId: tRes.data.id,
      status: tRes.data.status,
      assignedPsychologistId: tRes.data.assigned_psychologist_id,
      sessionId: tRes.data.session_id,
      severity: tRes.data.severity,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
