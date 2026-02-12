import { NextResponse } from "next/server";

function fallback() {
  return NextResponse.json({
    is_problem: false,
    topic: null,
    tags: [],
  });
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const inputText = String(text ?? "").trim();

    if (inputText.length < 3) return fallback();

    const workersUrl = process.env.WORKERS_AI_URL;
    if (!workersUrl) return fallback();

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["is_problem", "topic", "tags"],
      properties: {
        is_problem: { type: "boolean" },
        topic: {
          type: ["string", "null"],
          enum: [
            null,
            "Exam failure / arrears",
            "Placement preparation",
            "Career confusion",
            "Stress / burnout",
            "Depression / low mood",
            "Anxiety / panic",
            "Family / relationship",
            "Finance / money",
            "Health",
            "Addiction",
            "Other",
          ],
        },
        tags: {
          type: "array",
          items: { type: "string" },
          maxItems: 6,
        },
      },
    };

    const r = await fetch(workersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: inputText,
        systemPrompt: "Classify the user's message into a single topic and short tags. If it is not really a problem/help request, set is_problem=false and topic=null.",
        schema,
      }),
    });

    if (!r.ok) return fallback();

    const data = await r.json();
    const out: string | undefined = data?.output_text;
    if (!out) return fallback();

    const parsed = JSON.parse(out);

    return NextResponse.json({
      is_problem: Boolean(parsed.is_problem),
      topic: parsed.topic ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    });
  } catch (e) {
    console.error("classify-problem error:", e);
    return fallback();
  }
}
