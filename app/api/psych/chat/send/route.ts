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

type Body = { sessionId: string; ticketId: string; message: string };

export async function POST(req: Request) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = userClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    const msg = (body.message || "").trim();
    if (!body.sessionId || !body.ticketId || !msg) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // user can only send in their own session
    const { data: sessionRow } = await supabase
      .from("chat_sessions")
      .select("user_id")
      .eq("id", body.sessionId)
      .single();

    if (sessionRow?.user_id !== authData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("chat_messages").insert({
      session_id: body.sessionId,
      user_id: authData.user.id,
      role: "user",
      content: msg,
    });

    if (error) return NextResponse.json({ error: "Failed to send" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
