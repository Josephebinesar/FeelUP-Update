import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function userClient(accessToken: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing supabase env");
  return createClient(url, anon, {
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });
}

function isPsychologistEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  return e.endsWith("@psychologist.feelup");
}

function isAdminEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  return e.endsWith("@admin.feelup");
}

type Body = { sessionId: string; ticketId: string; message: string };

export async function POST(req: Request) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = userClient(accessToken);

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = u.user.email ?? null;
    const allowed = isAdminEmail(email) || isPsychologistEmail(email);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await req.json()) as Body;
    const msg = (body.message || "").trim();

    if (!body.sessionId || !body.ticketId || !msg) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // If you use assignment in tickets, keep this check.
    // If you don't, you can remove this whole block.
    const { data: ticket, error: tErr } = await supabase
      .from("escalation_tickets")
      .select("assigned_psychologist_id, status")
      .eq("id", body.ticketId)
      .single();

    if (tErr) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (!isAdminEmail(email)) {
      // psychologist must be assigned
      if (ticket?.assigned_psychologist_id && ticket.assigned_psychologist_id !== u.user.id) {
        return NextResponse.json({ error: "Not assigned to you" }, { status: 403 });
      }
    }

    const { error } = await supabase.from("chat_messages").insert({
      session_id: body.sessionId,
      user_id: u.user.id,
      role: "psychologist",
      content: msg,
    });

    if (error) return NextResponse.json({ error: error.message || "Send failed" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
