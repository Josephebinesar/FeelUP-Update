/**
 * FeelUp Cloudflare Worker
 *
 * Routes:
 *   POST /        — AI support chat (severity detection + rule-based replies)
 *   POST /embed   — Text embedding using @cf/baai/bge-base-en-v1.5 (768-dim)
 *   POST /        — (with { text, systemPrompt, schema }) — structured AI inference
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

/* ------------------------------------------------------------------ */
/*  Crisis severity detection                                           */
/* ------------------------------------------------------------------ */

function normalize(text) {
  return (text || "").toLowerCase();
}

function detectSeverity(text) {
  const t = normalize(text);
  const highSignals = [
    "suicide",
    "kill myself",
    "end my life",
    "self harm",
    "cut myself",
    "i want to die",
    "i will die",
  ];
  const mediumSignals = [
    "panic",
    "anxious",
    "anxiety",
    "can't breathe",
    "hopeless",
    "worthless",
    "depressed",
    "scared",
    "abuse",
  ];
  if (highSignals.some((k) => t.includes(k))) return 5;
  if (mediumSignals.some((k) => t.includes(k))) return 3;
  return 1;
}

function buildReply(message, history, severity) {
  if (severity >= 4) {
    return {
      reply:
        "I'm really sorry you're feeling this way. You deserve support right now.\n\n" +
        "If you're in immediate danger or might hurt yourself, please contact local emergency services or a trusted person nearby.\n\n" +
        "Stay with me—are you safe right now?",
      plan: [
        "Move to a safer place (away from anything you could use to hurt yourself)",
        "Call someone you trust and stay with them (friend/family)",
        "If risk feels high, contact emergency services immediately",
      ],
      tasks: [
        { title: "Text/call a trusted person now", minutes: 2 },
        { title: "Sit somewhere safe + slow breathing", minutes: 3 },
      ],
    };
  }

  const msg = (message || "").trim();
  const low = normalize(msg);

  if (msg.length <= 3) {
    return { reply: "Hey 🙂 I'm here with you.\n\nWhat's on your mind right now?", plan: [], tasks: [] };
  }

  if (["good", "fine", "ok", "okay", "better", "nice"].includes(low)) {
    return {
      reply: "That's good to hear 💛\n\nWhat made it feel a bit better today?",
      plan: ["Notice 1 good thing from today", "Do one 10-minute useful task"],
      tasks: [{ title: "Write 1 good thing from today", minutes: 2 }],
    };
  }

  if (low.includes("ask me") || low.includes("whatever")) {
    return {
      reply:
        "Okay 🙂\n\nPick one number:\n" +
        "1) Stress / overthinking\n" +
        "2) Sad / lonely\n" +
        "3) Fear / anxiety\n" +
        "4) Motivation / future\n\n" +
        "Reply 1, 2, 3, or 4.",
      plan: [],
      tasks: [],
    };
  }

  const followUp = msg.includes("?")
    ? "What answer are you hoping for deep down?"
    : "What's the hardest part of this right now?";

  return {
    reply: "I hear you. Thanks for telling me.\n\n" + `You said: "${msg}".\n\n` + followUp,
    plan: [
      "Take 5 slow breaths (4-in, 6-out)",
      "Write one sentence: 'Right now I feel ___ because ___'",
      "Choose one small step for the next 10 minutes",
    ],
    tasks: [
      { title: "5 slow breaths (4-in, 6-out)", minutes: 2 },
      { title: "Write: what I feel + why (one sentence)", minutes: 3 },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Structured AI inference (for analyze-mood, classify-problem, etc.) */
/* ------------------------------------------------------------------ */

async function handleStructuredInference(body, env) {
  const { text, systemPrompt, schema } = body;

  if (!text || !env.AI) {
    return json({ error: "Missing text or AI binding" }, 400);
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: text });

  const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    response_format: schema ? { type: "json_schema", json_schema: { schema } } : undefined,
  });

  const output_text =
    typeof aiResponse?.response === "string"
      ? aiResponse.response
      : aiResponse?.choices?.[0]?.message?.content ?? null;

  return json({ output_text });
}

/* ------------------------------------------------------------------ */
/*  Embedding generation — ML core for semantic peer matching          */
/* ------------------------------------------------------------------ */

async function handleEmbed(body, env) {
  const text = (body?.text || "").trim();

  if (!text) {
    return json({ error: "Missing text" }, 400);
  }

  if (!env.AI) {
    return json({ error: "AI binding not configured in wrangler.jsonc" }, 500);
  }

  // bge-base-en-v1.5 produces 768-dimensional embeddings
  const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [text],
  });

  const embedding = result?.data?.[0];

  if (!Array.isArray(embedding)) {
    return json({ error: "Embedding model returned unexpected shape", raw: result }, 500);
  }

  return json({ embedding, dimensions: embedding.length });
}

/* ------------------------------------------------------------------ */
/*  Main fetch handler                                                  */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS pre-flight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    // ── Route: /embed  →  Vector embedding (ML core)
    if (url.pathname === "/embed") {
      return handleEmbed(body, env);
    }

    // ── Route: /  with { text, systemPrompt }  →  Structured AI inference
    if (body?.text !== undefined && body?.systemPrompt !== undefined) {
      return handleStructuredInference(body, env);
    }

    // ── Route: /  default  →  Support chat (rule-based + severity)
    try {
      const message = (body.message || "").trim();
      const history = Array.isArray(body.history) ? body.history : [];

      if (!message) {
        return json({ error: "Missing message" }, 400);
      }

      const severity = detectSeverity(message);
      const escalated = severity >= 4;
      const out = buildReply(message, history, severity);

      return json({
        reply: out.reply,
        severity,
        escalated,
        plan: out.plan,
        tasks: out.tasks,
      });
    } catch {
      return json({ error: "Worker error" }, 500);
    }
  },
};
