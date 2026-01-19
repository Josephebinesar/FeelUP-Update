import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 2) {
      return NextResponse.json({
        mood: null,
        emoji: null,
        confidence: null,
        reason: null,
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `
You are an emotion analysis engine.

TASK:
Analyze the user's message and detect their emotional mood.

You MUST choose exactly ONE mood from this list:
😊 Happy
😌 Calm
🤩 Excited
🙏 Grateful
🤔 Thoughtful
😔 Sad
😰 Anxious
😴 Tired

Return ONLY valid JSON.
NO text. NO markdown.

JSON format:
{
  "mood": "Thoughtful",
  "emoji": "🤔",
  "confidence": 72,
  "reason": "The user is weighing options and expressing uncertainty."
}

Rules:
- confidence must be a NUMBER between 50 and 95
- reason must be ONE short sentence
- NEVER omit any field
`,
            },
            {
              role: "user",
              content: text,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) throw new Error("No AI content");

    const parsed = JSON.parse(content);

    return NextResponse.json({
      mood: parsed.mood,
      emoji: parsed.emoji,
      confidence: Number(parsed.confidence),
      reason: parsed.reason,
    });
  } catch (error) {
    console.error("Mood detection failed:", error);

    // 🛟 SAFE FALLBACK (NEVER BREAK UI)
    return NextResponse.json({
      mood: "Thoughtful",
      emoji: "🤔",
      confidence: 55,
      reason: "The message appears reflective or exploratory.",
    });
  }
}
