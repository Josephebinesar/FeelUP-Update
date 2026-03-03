import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabaseClient";
import { generateEmbedding } from "@/lib/embeddings";

/**
 * POST /api/research/match-ablation
 *
 * Research-only endpoint for threshold ablation experiments.
 * Accepts a custom threshold (0.0–1.0) and match_count.
 * DO NOT use in production UI — deployed UI uses /api/match-peers with fixed τ=0.65.
 *
 * Body: { text: string, threshold?: number, match_count?: number }
 * Returns: { matches, count, threshold_used, latency_embed_ms, latency_ann_ms }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const text = (body?.text || "").trim();
        const threshold = Math.min(Math.max(Number(body?.threshold ?? 0.65), 0.0), 1.0);
        const matchCount = Math.min(Number(body?.match_count ?? 5), 20);

        if (!text || text.length < 5) {
            return NextResponse.json({ error: "Text too short" }, { status: 400 });
        }

        // ── Phase 1: Embedding (timed separately)
        const t0 = Date.now();
        const embedding = await generateEmbedding(text);
        const latencyEmbed = Date.now() - t0;

        if (!embedding) {
            return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
        }

        // ── Phase 2: ANN search (timed separately)
        const supabase = createServerSupabaseClient();
        const t1 = Date.now();

        const { data, error } = await supabase.rpc("match_mood_posts", {
            query_embedding: embedding,
            match_threshold: threshold,
            match_count: matchCount,
            exclude_owner: null,
        });

        const latencyAnn = Date.now() - t1;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const matches = (data || []).map((row: any) => ({
            id: row.id,
            content: (row.content || "").slice(0, 200),
            mood: row.mood,
            anonymous: row.anonymous,
            similarity: Math.round(Number(row.similarity) * 100),
        }));

        return NextResponse.json({
            matches,
            count: matches.length,
            threshold_used: threshold,
            latency_embed_ms: latencyEmbed,
            latency_ann_ms: latencyAnn,
            latency_total_ms: latencyEmbed + latencyAnn,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
