import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function supabaseAnon(token: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/* ── GET  /api/challenges ── list challenges ── */
export async function GET(req: Request) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const visibility = searchParams.get("visibility"); // optional filter

    let query = admin
      .from("challenges")
      .select("id, title, description, starts_on, ends_on, visibility, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (visibility) query = query.eq("visibility", visibility);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ challenges: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

/* ── POST /api/challenges ── create a challenge ── */
export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = supabaseAnon(token);
    const admin = supabaseAdmin();

    // Auth check
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const { title, description, starts_on, ends_on, visibility, owner_id } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Validate dates
    if (starts_on && ends_on && new Date(ends_on) < new Date(starts_on)) {
      return NextResponse.json({ error: "ends_on must be after starts_on" }, { status: 400 });
    }

    const { data: challenge, error: insErr } = await admin
      .from("challenges")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        starts_on: starts_on || null,
        ends_on: ends_on || null,
        visibility: visibility || "public",
        owner_id: owner_id || u.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insErr || !challenge) {
      return NextResponse.json(
        { error: insErr?.message || "Insert failed" },
        { status: 500 }
      );
    }

    // Auto-join the creator as a participant
    await admin.from("challenge_participants").insert({
      challenge_id: challenge.id,
      user_id: u.user.id,
      joined_at: new Date().toISOString(),
    }).then(() => {});  // ignore errors (table may not exist yet)

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

/* ── DELETE /api/challenges?id=<id> ── */
export async function DELETE(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = supabaseAnon(token);
    const admin = supabaseAdmin();

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Only owner can delete
    const { data: existing } = await admin.from("challenges").select("owner_id").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.owner_id !== u.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin.from("challenges").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
