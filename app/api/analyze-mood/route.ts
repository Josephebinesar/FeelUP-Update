import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      input: [
        {
          role: "system",
          content:
            "You are an emotion detection AI. Respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: `
Analyze the emotion of this text:

"${text}"

Return JSON ONLY in this format:
{
  "mood": "Happy | Sad | Anxious | Angry | Neutral",
  "confidence": number between 0 and 1,
  "ai_detected": true
}
          `,
        },
      ],
    });

    const raw =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "{}";

    const parsed = JSON.parse(raw);

    return NextResponse.json({
      mood: parsed.mood ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      ai_detected: parsed.ai_detected === true,
    });
  } catch (error) {
    console.error("OpenAI mood analysis error:", error);

    return NextResponse.json({
      ai_detected: false,
      mood: null,
      confidence: 0,
    });
  }
}
