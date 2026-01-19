import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

/* ====================================================
   PROFILE SYNC (AUTH CALLBACK SAFE)
   ✔ Server-only
   ✔ Idempotent
   ✔ No duplicates
==================================================== */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name } = body || {};

    if (!email) {
      return NextResponse.json(
        { error: "Missing email" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          email,
          full_name: name ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      )
      .select()
      .single();

    if (error) {
      console.error("Profile sync error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (err: any) {
    console.error("Profile sync catch error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
