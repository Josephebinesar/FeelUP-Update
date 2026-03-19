import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * GET /api/search?q=<query>&limit=8
 *
 * Returns combined results from:
 *  - profiles (users)
 *  - mood_posts (public)
 *  - events
 *  - community_circles
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") || 8), 20);

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const admin = supabaseAdmin();
    const pattern = `%${q}%`;
    const results: any[] = [];

    // ── Users (profiles) ──
    const usersRes = await admin
      .from("profiles")
      .select("id, full_name, username")
      .or(`full_name.ilike.${pattern},username.ilike.${pattern}`)
      .limit(4);

    if (!usersRes.error && usersRes.data) {
      for (const u of usersRes.data) {
        results.push({
          type: "user",
          id: u.id,
          title: u.full_name || u.username || "User",
          subtitle: u.username ? `@${u.username}` : undefined,
          href: `/profile/${u.id}`,
        });
      }
    }

    // ── Public mood posts ──
    const postsRes = await admin
      .from("mood_posts")
      .select("id, content, mood, mood_emoji")
      .eq("visibility", "public")
      .eq("anonymous", false)
      .ilike("content", pattern)
      .not("content", "is", null)
      .limit(4);

    if (!postsRes.error && postsRes.data) {
      for (const p of postsRes.data) {
        const preview = (p.content || "").slice(0, 60);
        results.push({
          type: "post",
          id: p.id,
          title: `${p.mood_emoji || ""} ${p.mood || "Post"}`,
          subtitle: preview + (p.content?.length > 60 ? "…" : ""),
          href: `/mood-feed`,
        });
      }
    }

    // ── Events ──
    const eventsRes = await admin
      .from("events")
      .select("id, title, category, event_date")
      .or(`title.ilike.${pattern},category.ilike.${pattern}`)
      .limit(3);

    if (!eventsRes.error && eventsRes.data) {
      for (const e of eventsRes.data) {
        results.push({
          type: "event",
          id: e.id,
          title: e.title,
          subtitle: e.category || (e.event_date ? new Date(e.event_date).toLocaleDateString() : undefined),
          href: `/events/${e.id}`,
        });
      }
    }

    // ── Community Circles ──
    const circlesRes = await admin
      .from("community_circles")
      .select("id, name, description, visibility")
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .eq("visibility", "public")
      .limit(3);

    if (!circlesRes.error && circlesRes.data) {
      for (const c of circlesRes.data) {
        results.push({
          type: "circle",
          id: c.id,
          title: c.name,
          subtitle: c.description ? c.description.slice(0, 60) : "Public circle",
          href: `/community/circles/${c.id}`,
        });
      }
    }

    // Deduplicate + cap at limit
    const seen = new Set<string>();
    const unique = results.filter((r) => {
      const key = `${r.type}-${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);

    return NextResponse.json({ results: unique });
  } catch (e: any) {
    console.error("search API error:", e);
    return NextResponse.json({ results: [] });
  }
}
