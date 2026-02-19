// app/api/detect-mood/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MOODS = [
  { mood: "Happy", emoji: "😊" },
  { mood: "Calm", emoji: "😌" },
  { mood: "Excited", emoji: "🤩" },
  { mood: "Grateful", emoji: "🙏" },
  { mood: "Thoughtful", emoji: "🤔" },
  { mood: "Sad", emoji: "😔" },
  { mood: "Anxious", emoji: "😰" },
  { mood: "Tired", emoji: "😴" },
] as const;

type MoodLabel = (typeof MOODS)[number]["mood"];

function emojiFor(mood: MoodLabel) {
  return MOODS.find((m) => m.mood === mood)?.emoji ?? "🤔";
}

function noSuggestion(reason: string, debug?: any) {
  if (debug) console.error("detect-mood debug:", debug);
  return NextResponse.json({
    mood: null,
    emoji: null,
    confidence: null,
    reason,
  });
}

// tiny in-memory cache (server)
const CACHE = new Map<string, any>();
const MAX_CACHE = 500;

function norm(s: string) {
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Map GoEmotions labels -> your UI moods
 * Model outputs many labels; we map them down to your 8 moods.
 */
function mapLabelToMood(label: string): MoodLabel {
  const s = String(label || "").toLowerCase();

  // Happy
  if (["joy", "amusement", "optimism", "pride", "relief"].includes(s)) return "Happy";

  // Calm (closest)
  if (["neutral", "admiration", "approval", "realization"].includes(s)) return "Calm";

  // Excited
  if (["excitement", "surprise"].includes(s)) return "Excited";

  // Grateful
  if (["gratitude"].includes(s)) return "Grateful";

  // Thoughtful
  if (["curiosity", "confusion", "desire"].includes(s)) return "Thoughtful";

  // Sad
  if (["sadness", "disappointment", "grief", "remorse", "embarrassment"].includes(s)) return "Sad";

  // Anxious
  if (["fear", "nervousness", "anxiety"].includes(s)) return "Anxious";

  // Tired (no direct label in GoEmotions; map low-energy feelings if present)
  if (["tired", "fatigue"].includes(s)) return "Tired";

  // fallback mappings
  if (["anger", "annoyance", "disapproval"].includes(s)) return "Anxious";
  return "Thoughtful";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.text ?? "").trim();

    if (raw.length < 2) return noSuggestion("Too short to detect mood.");

    const key = norm(raw);
    const cached = CACHE.get(key);
    if (cached) return NextResponse.json(cached);

    const hfKey = process.env.HF_API_KEY;
    if (!hfKey) {
      return noSuggestion("HF_API_KEY missing in .env.local (server).");
    }

    // Router endpoint (api-inference is deprecated; use router.huggingface.co/hf-inference) :contentReference[oaicite:2]{index=2}
    const MODEL_ID = "SamLowe/roberta-base-go_emotions";
    const MODEL_URL = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(MODEL_ID)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const r = await fetch(MODEL_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: raw }),
    });

    clearTimeout(timeout);

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("HuggingFace router error:", r.status, errText);

      if (r.status === 401 || r.status === 403) {
        return noSuggestion("HuggingFace auth failed. Check token permissions (Inference Providers).");
      }
      if (r.status === 429) {
        return noSuggestion("HuggingFace rate limit hit (429). Try again later.");
      }
      // Some models/providers may return 410/404 if not available on hf-inference
      return noSuggestion(`HuggingFace request failed (${r.status}). Check server logs.`);
    }

    const data = await r.json();

    // Router + hf-inference commonly returns: [[{label, score}, ...]]
    const arr = Array.isArray(data) ? data : null;
    const candidates = Array.isArray(arr?.[0]) ? arr?.[0] : [];

    if (!candidates.length) {
      console.error("HF returned unexpected shape:", data);
      return noSuggestion("AI response unreadable. Check server logs.", data);
    }

    const top = candidates.reduce(
      (best: any, cur: any) => (cur?.score > best?.score ? cur : best),
      candidates[0]
    );

    const topLabel = String(top?.label || "");
    const topScore = Number(top?.score || 0);

    const mood = mapLabelToMood(topLabel);

    // keep your UI-style confidence band
    const confidence = Math.max(50, Math.min(95, Math.round(topScore * 100)));
    const reason = `Detected emotional tone: ${topLabel}`;

    const result = {
      mood,
      emoji: emojiFor(mood),
      confidence,
      reason,
    };

    // cache (TypeScript-safe eviction)
    CACHE.set(key, result);
    if (CACHE.size > MAX_CACHE) {
      const iterator = CACHE.keys().next();
      if (!iterator.done) {
        CACHE.delete(iterator.value);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("detect-mood route crashed:", err);
    return noSuggestion("Mood detection crashed. Check server logs.");
  }
}
