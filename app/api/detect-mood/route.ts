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

function extractTextFromResponsesPayload(data: any): string | null {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const out = data?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (typeof c?.text === "string" && c.text.trim()) return c.text.trim();
          if (typeof c?.text?.value === "string" && c.text.value.trim()) return c.text.value.trim();
        }
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.text ?? "").trim();

    if (raw.length < 2) return noSuggestion("Too short to detect mood.");

    const key = norm(raw);
    const cached = CACHE.get(key);
    if (cached) return NextResponse.json(cached);

    // Cloudflare Workers AI configuration
    const workersUrl = process.env.WORKERS_AI_URL;
    if (!workersUrl) {
      return noSuggestion("WORKERS_AI_URL missing in .env.local (server).");
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["mood", "confidence", "reason"],
      properties: {
        mood: {
          type: "string",
          enum: ["Happy", "Calm", "Excited", "Grateful", "Thoughtful", "Sad", "Anxious", "Tired"],
        },
        confidence: { type: "number", minimum: 50, maximum: 95 },
        reason: { type: "string", minLength: 1, maxLength: 140 },
      },
    } as const;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    // Call Cloudflare Worker
    const r = await fetch(workersUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: raw,
        systemPrompt: [
          "Classify the user's message into exactly ONE mood from the list.",
          "Pick the closest mood even if the message is short.",
          "Do NOT default to Thoughtful unless the text is reflective (thinking/meaning/unsure).",
          "If positive like 'today is good' => Happy.",
          "If stress/overwhelm like 'day is hectic' => Anxious.",
          "Return ONLY strict JSON.",
        ].join(" "),
        schema,
      }),
    });

    clearTimeout(timeout);

    // handle non-OK
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("detect-mood Cloudflare Worker error:", r.status, errText);

      // QUOTA / BILLING
      if (r.status === 429) {
        return noSuggestion(
          "AI quota/billing exceeded (429). Check Cloudflare Workers AI limits."
        );
      }

      return noSuggestion(`AI request failed (${r.status}). Check server logs.`);
    }

    const data = await r.json();
    const outputText = extractTextFromResponsesPayload(data);
    if (!outputText) return noSuggestion("AI response unreadable. Check server logs.", data);

    let parsed: { mood: MoodLabel; confidence: number; reason: string };
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return noSuggestion("AI returned invalid JSON. Check server logs.", { outputText });
    }

    const result = {
      mood: parsed.mood,
      emoji: emojiFor(parsed.mood),
      confidence: Math.max(50, Math.min(95, Math.round(Number(parsed.confidence)))),
      reason: String(parsed.reason || "").slice(0, 140),
    };

    // store cache
    CACHE.set(key, result);
    if (CACHE.size > MAX_CACHE) {
      const first = CACHE.keys().next().value;
      CACHE.delete(first);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("detect-mood route crashed:", err);
    return noSuggestion("Mood detection crashed. Check server logs.");
  }
}
