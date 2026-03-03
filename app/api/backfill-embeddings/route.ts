import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import { generateEmbedding } from "@/lib/embeddings";

/**
 * POST /api/backfill-embeddings
 *
 * Finds all public mood_posts with no embedding and generates them.
 * Run this once to fix existing posts that were created before the ML feature.
 *
 * Body (optional): { limit: number }  — default 50
 * Returns: { processed, succeeded, failed, errors }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const limit = Math.min(Number(body?.limit ?? 50), 100);

        const supabase = createServerSupabaseClient();

        // Fetch posts with no embedding
        const { data: posts, error } = await supabase
            .from("mood_posts")
            .select("id, content, mood")
            .is("embedding", null)
            .eq("visibility", "public")
            .not("content", "is", null)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!posts || posts.length === 0) {
            return NextResponse.json({
                message: "✅ All posts already have embeddings!",
                processed: 0,
                succeeded: 0,
                failed: 0,
            });
        }

        let succeeded = 0;
        let failed = 0;
        const errors: string[] = [];

        // Process posts one-by-one (avoid rate limiting)
        for (const post of posts) {
            if (!post.content || post.content.trim().length < 5) {
                failed++;
                continue;
            }

            const embedText = `${post.mood ?? "Neutral"}: ${post.content.trim()}`;
            const embedding = await generateEmbedding(embedText);

            if (!embedding) {
                failed++;
                errors.push(`Post ${post.id}: embedding generation failed`);
                continue;
            }

            const { error: updateErr } = await supabase
                .from("mood_posts")
                .update({ embedding: embedding as any })
                .eq("id", post.id);

            if (updateErr) {
                failed++;
                errors.push(`Post ${post.id}: ${updateErr.message}`);
            } else {
                succeeded++;
                console.log(`[backfill] ✅ Post ${post.id} embedded`);
            }

            // Small delay to avoid rate limiting HuggingFace (free tier: ~1 req/sec)
            await new Promise((r) => setTimeout(r, 1100));
        }

        return NextResponse.json({
            message: `Backfill complete — ${succeeded}/${posts.length} posts embedded.`,
            processed: posts.length,
            succeeded,
            failed,
            errors: errors.slice(0, 10), // cap error list
        });
    } catch (err: any) {
        console.error("backfill-embeddings error:", err);
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
    }
}
