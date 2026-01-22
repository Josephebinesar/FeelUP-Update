import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function userClient(accessToken: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });
}

type Body = { ticketId: string; scheduledAt: string; mode?: "video" | "call" };

export async function POST(req: Request) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = userClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    if (!body.ticketId || !body.scheduledAt) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // confirm ticket belongs to user
    const { data: ticket } = await supabase
      .from("escalation_tickets")
      .select("id, user_id, assigned_psychologist_id")
      .eq("id", body.ticketId)
      .single();

    if (!ticket || ticket.user_id !== authData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("psych_appointments").insert({
      ticket_id: body.ticketId,
      user_id: authData.user.id,
      psychologist_id: ticket.assigned_psychologist_id ?? null,
      scheduled_at: body.scheduledAt,
      mode: body.mode ?? "video",
      status: "requested",
    });

    if (error) return NextResponse.json({ error: "Failed to request appointment" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
