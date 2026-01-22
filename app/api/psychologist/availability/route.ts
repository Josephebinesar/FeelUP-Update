import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function userClient(accessToken: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} } });
}

type Body = { isAvailable: boolean };

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

    const { error } = await supabase
      .from("psychologists")
      .upsert({ user_id: u.user.id, is_available: Boolean(body.isAvailable) });

    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
