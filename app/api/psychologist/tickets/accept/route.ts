import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function userClient(accessToken: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} } });
}

type Body = { ticketId: string };

export async function POST(req: Request) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = userClient(accessToken);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
    if (profile?.role !== "psychologist" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    if (!body.ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });

    const { error } = await supabase
      .from("escalation_tickets")
      .update({ assigned_psychologist_id: u.user.id, status: "assigned" })
      .eq("id", body.ticketId);

    if (error) return NextResponse.json({ error: "Accept failed" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
