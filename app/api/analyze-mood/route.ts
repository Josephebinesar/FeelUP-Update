import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 3) {
      return NextResponse.json({
        ai_detected: false,
        mood: null,
        confidence: 0,
      });
    }

    const workersUrl = process.env.WORKERS_AI_URL;
    if (!workersUrl) {
      return NextResponse.json({
        ai_detected: false,
        mood: null,
        confidence: 0,
      });
    }

    const response = await fetch(workersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `Analyze the emotion of this text:

"${text}"

Return JSON ONLY in this format:
{
  "mood": "Happy | Sad | Anxious | Angry | Neutral",
  "confidence": number between 0 and 1,
  "ai_detected": true
}`,
        systemPrompt: "You are an emotion detection AI. Respond ONLY with valid JSON.",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["mood", "confidence", "ai_detected"],
          properties: {
            mood: {
              type: "string",
              enum: ["Happy", "Sad", "Anxious", "Angry", "Neutral"],
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            ai_detected: { type: "boolean" },
          },
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        ai_detected: false,
        mood: null,
        confidence: 0,
      });
    }

    const data = await response.json();
    const raw = data?.output_text || data?.output?.[0]?.content?.[0]?.text || "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      mood: parsed.mood ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      ai_detected: parsed.ai_detected === true,
    });
  } catch (error) {
    console.error("Cloudflare Worker mood analysis error:", error);

    return NextResponse.json({
      ai_detected: false,
      mood: null,
      confidence: 0,
    });
  }
}
