import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";

/**
 * Table: mood_posts
 * Expected columns (from your UI):
 * id, content, mood, mood_emoji, mood_color, image_url,
 * anonymous, visibility, owner_id, created_at,
 * ai_detected, ai_confidence, ai_reason, energy_level
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const limit = Number(url.searchParams.get("limit") || 20);
    const visibility = (url.searchParams.get("visibility") || "public") as
      | "public"
      | "followers"
      | "mutuals";

    const owner_id = url.searchParams.get("owner_id"); // optional: filter by owner
    const supabase = createServerSupabaseClient();

    let q = supabase
      .from("mood_posts")
      .select(
        `
        id,
        content,
        mood,
        mood_emoji,
        mood_color,
        image_url,
        anonymous,
        visibility,
        owner_id,
        created_at,
        ai_detected,
        ai_confidence,
        ai_reason,
        energy_level
      `
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));

    // filters
    if (owner_id) q = q.eq("owner_id", owner_id);
    if (visibility) q = q.eq("visibility", visibility);

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data || [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      owner_id,
      content,
      mood,
      mood_emoji,
      mood_color,
      image_url,
      anonymous,
      visibility,
      ai_detected,
      ai_confidence,
      ai_reason,
      energy_level,
    } = body || {};

    if (!owner_id) {
      return NextResponse.json({ error: "Missing owner_id" }, { status: 400 });
    }

    // allow content to be empty, but not undefined
    const safeContent = typeof content === "string" ? content.trim() : null;

    if (!mood || !mood_emoji || !mood_color) {
      return NextResponse.json(
        { error: "Missing mood fields (mood, mood_emoji, mood_color)" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const payload: any = {
      owner_id,
      content: safeContent, // can be null
      mood,
      mood_emoji,
      mood_color,
      image_url: image_url || null,
      anonymous: !!anonymous,
      visibility: visibility || "public",
      ai_detected: !!ai_detected,
      ai_confidence: typeof ai_confidence === "number" ? ai_confidence : null,
      ai_reason: typeof ai_reason === "string" ? ai_reason : null,
      energy_level: typeof energy_level === "number" ? energy_level : null,
    };

    const { data, error } = await supabase
      .from("mood_posts")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    const body = await req.json().catch(() => ({}));
    const { owner_id, content, mood, mood_emoji, mood_color, image_url, visibility } =
      body || {};

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    if (!owner_id) {
      return NextResponse.json({ error: "Missing owner_id" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // ownership check
    const { data: existing, error: exErr } = await supabase
      .from("mood_posts")
      .select("id, owner_id, anonymous")
      .eq("id", id)
      .single();

    if (exErr || !existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (existing.owner_id !== owner_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (existing.anonymous) {
      return NextResponse.json(
        { error: "Anonymous posts cannot be edited" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (typeof content === "string") updateData.content = content.trim();
    if (typeof mood === "string") updateData.mood = mood;
    if (typeof mood_emoji === "string") updateData.mood_emoji = mood_emoji;
    if (typeof mood_color === "string") updateData.mood_color = mood_color;
    if (typeof image_url === "string" || image_url === null)
      updateData.image_url = image_url;
    if (typeof visibility === "string") updateData.visibility = visibility;

    const { data, error } = await supabase
      .from("mood_posts")
      .update(updateData)
      .eq("id", id)
      .eq("owner_id", owner_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const owner_id = url.searchParams.get("owner_id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    if (!owner_id) {
      return NextResponse.json({ error: "Missing owner_id" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // ownership check
    const { data: existing, error: exErr } = await supabase
      .from("mood_posts")
      .select("id, owner_id, anonymous")
      .eq("id", id)
      .single();

    if (exErr || !existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (existing.owner_id !== owner_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (existing.anonymous) {
      return NextResponse.json(
        { error: "Anonymous posts cannot be deleted" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("mood_posts")
      .delete()
      .eq("id", id)
      .eq("owner_id", owner_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
