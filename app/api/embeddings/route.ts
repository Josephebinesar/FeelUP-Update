import { NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings";

/**
 * POST /api/embeddings
 * Body: { text: string }
 * Returns: { embedding: number[], dimensions: number }
 *
 * Uses Cloudflare Worker primary + HuggingFace BAAI/bge-base-en-v1.5 fallback.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const text = (body?.text || "").trim();

        if (!text || text.length < 3) {
            return NextResponse.json({ error: "Text too short to embed" }, { status: 400 });
        }

        const embedding = await generateEmbedding(text);

        if (!embedding) {
            return NextResponse.json(
                { error: "Embedding generation failed — check server logs" },
                { status: 502 }
            );
        }

        return NextResponse.json({ embedding, dimensions: embedding.length });
    } catch (err: any) {
        console.error("embeddings API error:", err);
        return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
}
