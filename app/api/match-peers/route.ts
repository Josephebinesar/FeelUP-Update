import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import { generateEmbedding } from "@/lib/embeddings";

/**
 * POST /api/match-peers
 * Body: { text: string, owner_id?: string }
 *
 * ML Semantic Matching Pipeline:
 *  1. Generate a 768-dim embedding (Cloudflare → HuggingFace fallback)
 *  2. Query Supabase RPC `match_mood_posts` via pgvector cosine distance (<=>)
 *  3. Return top-5 semantically similar public posts with similarity scores
 */

type MatchedPost = {
    id: string;
    content: string | null;
    mood: string | null;
    mood_emoji: string | null;
    anonymous: boolean;
    owner_id: string;
    created_at: string;
    similarity: number;
};

function fallback(reason: string) {
    console.warn("match-peers fallback:", reason);
    return NextResponse.json({ matches: [], reason });
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const text = (body?.text || "").trim();
        const ownerId: string | undefined = body?.owner_id || undefined;

        if (!text || text.length < 5) {
            return fallback("Input text too short for semantic matching.");
        }

        // ── Step 1: Generate embedding (Cloudflare → HuggingFace fallback)
        const embedding = await generateEmbedding(text);

        if (!embedding) {
            return fallback("Embedding generation failed. Check server logs.");
        }

        // ── Step 2: K-Nearest Neighbours via pgvector cosine distance
        const supabase = createServerSupabaseClient();

        const { data, error } = await supabase.rpc("match_mood_posts", {
            query_embedding: embedding,
            match_threshold: 0.60,
            match_count: 5,
            exclude_owner: ownerId || null,
        });

        if (error) {
            console.error("match_mood_posts RPC error:", error.message);
            return fallback(
                "Database vector search failed. Make sure the SQL migration was run in Supabase."
            );
        }

        const matches: MatchedPost[] = (data || []).map((row: any) => ({
            id: row.id,
            content: (row.content || "").slice(0, 200),
            mood: row.mood,
            mood_emoji: row.mood_emoji,
            anonymous: row.anonymous,
            owner_id: row.anonymous ? "anonymous" : row.owner_id,
            created_at: row.created_at,
            similarity: Math.round(Number(row.similarity) * 100),
        }));

        return NextResponse.json({
            matches,
            count: matches.length,
            query_text: text.slice(0, 100),
        });
    } catch (err: any) {
        console.error("match-peers route error:", err);
        return fallback("Semantic matching crashed. Check server logs.");
    }
}
