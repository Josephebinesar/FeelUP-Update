import { NextResponse } from "next/server";

type WeeklyPost = {
  created_at?: string;
  mood?: string;
  content?: string | null;
  energy_level?: number | null;
};

function safeWeeklyFallback() {
  return NextResponse.json({
    text: "Small steps count 🌱 Try this: drink water, take 5 slow breaths, and write 1 win from today (even a tiny one).",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const days = Number(body?.days ?? 7);
    const posts: WeeklyPost[] = Array.isArray(body?.posts) ? body.posts : [];

    const workersUrl = process.env.WORKERS_AI_URL;
    if (!workersUrl) return safeWeeklyFallback();

    if (posts.length === 0) {
      return NextResponse.json({
        text: "No check-ins this week — that’s okay 💛. Try one simple post today: mood + one sentence about what caused it.",
      });
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["text"],
      properties: {
        text: { type: "string", minLength: 10, maxLength: 450 },
      },
    };

    const compact = posts.slice(0, 30).map((p) => ({
      date: p.created_at ?? null,
      mood: p.mood ?? null,
      energy: typeof p.energy_level === "number" ? p.energy_level : null,
      text: (p.content ?? "").slice(0, 240),
    }));

    const r = await fetch(workersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: JSON.stringify({ days, posts: compact }),
        systemPrompt: [
          "You write short, supportive weekly reflections for students.",
          "Must include:",
          "1) a pattern noticed,",
          "2) two practical tips,",
          "3) one encouraging line.",
          "No medical/clinical claims. Keep it warm and simple.",
          `Use the last ${days} days posts only.`,
        ].join("\n"),
        schema,
      }),
    });

    if (!r.ok) return safeWeeklyFallback();

    const data = await r.json();
    const outputText: string | undefined = data?.output_text;
    if (!outputText) return safeWeeklyFallback();

    const parsed = JSON.parse(outputText) as { text: string };
    return NextResponse.json({ text: String(parsed.text) });
  } catch (err) {
    console.error("Weekly reflection failed:", err);
    return safeWeeklyFallback();
  }
}
