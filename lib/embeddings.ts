/**
 * lib/embeddings.ts
 *
 * Shared utility for generating 768-dimensional sentence embeddings.
 *
 * Strategy (automatic fallback):
 *   1. Try Cloudflare Worker /embed  (WORKERS_AI_URL)
 *   2. Fall back to HuggingFace BAAI/bge-base-en-v1.5  (HF_API_KEY)
 *
 * Both models produce 768-dim vectors — SQL schema stays unchanged.
 */

const HF_MODEL = "BAAI/bge-base-en-v1.5";
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

/** Generate a 768-dim embedding vector from text. Returns null on failure. */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    const cleaned = text.trim();
    if (cleaned.length < 3) return null;

    // ── Primary: Cloudflare Workers AI (/embed route)
    const workerUrl = process.env.WORKERS_AI_URL;
    if (workerUrl) {
        try {
            const embedUrl = workerUrl.replace(/\/$/, "") + "/embed";
            const r = await fetch(embedUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cleaned }),
                signal: AbortSignal.timeout(12000),
            });

            if (r.ok) {
                const data = await r.json();
                const vec: number[] = data?.embedding;
                if (Array.isArray(vec) && vec.length === 768) {
                    console.log(`[embeddings] Cloudflare OK — ${vec.length} dims`);
                    return vec;
                }
            } else {
                console.warn(`[embeddings] Cloudflare /embed returned ${r.status} — trying HuggingFace`);
            }
        } catch (e: any) {
            console.warn("[embeddings] Cloudflare /embed failed:", e?.message, "— trying HuggingFace");
        }
    }

    // ── Fallback: HuggingFace Inference API (same model, same 768 dims)
    const hfKey = process.env.HF_API_KEY;
    if (!hfKey) {
        console.error("[embeddings] Both Cloudflare and HF_API_KEY unavailable.");
        return null;
    }

    try {
        const r = await fetch(HF_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${hfKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: [cleaned] }),
            signal: AbortSignal.timeout(20000),
        });

        if (!r.ok) {
            const errText = await r.text().catch(() => "");
            console.error(`[embeddings] HuggingFace error ${r.status}:`, errText);
            return null;
        }

        const data = await r.json();

        // HuggingFace feature-extraction returns: [[float, float, ...]]
        const raw = data?.[0];
        const vec: number[] | null = Array.isArray(raw) ? (raw as number[]) : null;

        if (!Array.isArray(vec) || vec.length !== 768) {
            console.error("[embeddings] HuggingFace unexpected shape:", JSON.stringify(data).slice(0, 200));
            return null;
        }

        console.log(`[embeddings] HuggingFace OK — ${vec.length} dims`);
        return vec;
    } catch (e: any) {
        console.error("[embeddings] HuggingFace failed:", e?.message);
        return null;
    }
}
