import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function userClient(accessToken: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, service);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type ReqBody = { sessionId?: string; message: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type RiskJson = {
  severity: 0 | 1 | 2 | 3 | 4;
  needs_human: boolean;
  immediate_danger: boolean;
  reason: string;
};

type SupportJson = {
  reply: string;
  actionPlan: string[];
  journalPrompt: string;
  groundingExercise: string;
};

function safeJsonParse<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function POST(req: Request) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const supabase = userClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = authData.user;

    const body = (await req.json()) as ReqBody;
    const userMessage = (body.message || "").trim();
    if (!userMessage) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    // Ensure session
    let sessionId = body.sessionId;
    if (!sessionId) {
      const { data: newSession, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (error || !newSession?.id) return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
      sessionId = newSession.id;
    }

    // Store user message
    const { error: insertUserErr } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "user",
      content: userMessage,
    });
    if (insertUserErr) return NextResponse.json({ error: "Failed to store message" }, { status: 500 });

    // Load history
    const { data: history, error: histErr } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(12);
    if (histErr) return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
    const ordered = (history ?? []).reverse();

    // Risk classifier
    const riskPrompt = `
Return JSON only: {"severity":0|1|2|3|4,"needs_human":true|false,"immediate_danger":true|false,"reason":"short"}.
0 normal stress / breakup sadness
1 moderate distress
2 high distress, needs professional support soon
3 urgent crisis / self-harm thoughts / abuse / violence
4 emergency: plan/intent/immediate danger
needs_human=true if severity>=2.
immediate_danger=true only if imminent risk.
`;

    const riskResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: riskPrompt },
        ...ordered.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      response_format: { type: "json_object" },
    });

    const risk = safeJsonParse<RiskJson>(riskResp.choices[0]?.message?.content || "{}", {
      severity: 0, needs_human: false, immediate_danger: false, reason: "ok",
    });

    const severity = clamp(Number(risk.severity ?? 0), 0, 4) as 0|1|2|3|4;
    const shouldEscalate = Boolean(risk.needs_human) || severity >= 2;
    const isUrgent = severity >= 3 || Boolean(risk.immediate_danger);

    // Assistant + support cards
    const assistantPrompt = `
You are FeelUp Support Buddy (NOT a doctor).
Return JSON ONLY:
{"reply":"string","actionPlan":["a","b","c"],"journalPrompt":"string","groundingExercise":"string"}

Reply rules:
- Warm, short, non-judgmental.
- Ask ONE question at the end.
- Always include: "I’m not a doctor—just an assistant."
- If breakup: validate + suggest boundary (mute/unfollow) + 1 small action.
- If urgent: encourage contacting local emergency services or trusted person.
`;

    const assistantResp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: assistantPrompt + (isUrgent ? "\nUser is urgent. Be extra safety-focused." : "") },
        ...ordered.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      response_format: { type: "json_object" },
    });

    const support = safeJsonParse<SupportJson>(assistantResp.choices[0]?.message?.content || "{}", {
      reply: "I’m here with you.\n\nI’m not a doctor—just an assistant.\n\nWhat’s going on right now?",
      actionPlan: ["Take 10 slow breaths", "Drink water + eat something small", "Message a trusted person"],
      journalPrompt: "What are you feeling right now, and what do you need most today?",
      groundingExercise: "Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.",
    });

    let assistantText = (support.reply || "").trim();

    // Escalation nudge (convincing + CTA)
    let nextActions: { chatNowUrl?: string; scheduleUrl?: string } = {};
    if (shouldEscalate) {
      assistantText +=
        "\n\nI’m really glad you shared this with me. I can stay with you here, but a real psychologist can help you more effectively.\n" +
        "I can connect you to a FeelUp psychologist now.\n" +
        "Would you like to **Chat now** or **Schedule a video call**?";
    }

    // Store assistant
    const { error: insertAsstErr } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "assistant",
      content: assistantText,
      severity_score: severity,
    });
    if (insertAsstErr) return NextResponse.json({ error: "Failed to store assistant message" }, { status: 500 });

    // Ticket creation/assignment
    let ticketId: string | null = null;
    let assignedPsychologistId: string | null = null;

    if (shouldEscalate) {
      // Create or reuse pending ticket (under user auth)
      const { data: existing } = await supabase
        .from("escalation_tickets")
        .select("id, assigned_psychologist_id, status")
        .eq("session_id", sessionId)
        .eq("status", "pending")
        .maybeSingle();

      if (existing?.id) {
        ticketId = existing.id;
        assignedPsychologistId = existing.assigned_psychologist_id ?? null;
      } else {
        const summaryResp = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          temperature: 0,
          messages: [
            { role: "system", content: "Summarize for psychologist in 4-6 lines. No diagnosis. Include risk signals." },
            ...ordered.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
        });

        const summary = (summaryResp.choices[0]?.message?.content || "Needs professional support.").trim();

        const { data: ticket, error: ticketErr } = await supabase
          .from("escalation_tickets")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            severity_score: severity,
            summary,
            status: "pending",
          })
          .select("id")
          .single();

        if (!ticketErr && ticket?.id) ticketId = ticket.id;
      }

      // ✅ urgent: auto-assign available psychologist (SERVICE ROLE)
      if (isUrgent && ticketId) {
        const admin = adminClient();

        const { data: available } = await admin
          .from("psychologists")
          .select("user_id")
          .eq("is_available", true)
          .order("created_at", { ascending: true })
          .limit(1);

        const picked = available?.[0]?.user_id ?? null;

        if (picked) {
          assignedPsychologistId = picked;

          await admin
            .from("escalation_tickets")
            .update({ assigned_psychologist_id: picked, status: "assigned" })
            .eq("id", ticketId);

          await admin.from("chat_sessions").update({ status: "escalated" }).eq("id", sessionId);
        }
      }

      // Provide URLs to user UI
      nextActions = {
        chatNowUrl: ticketId ? `/psych-chat?sessionId=${sessionId}&ticketId=${ticketId}` : undefined,
        scheduleUrl: ticketId ? `/schedule-call?ticketId=${ticketId}` : undefined,
      };
    }

    return NextResponse.json({
      sessionId,
      reply: assistantText,
      severity,
      escalated: shouldEscalate,
      ticketId,
      assignedPsychologistId,
      actionPlan: Array.isArray(support.actionPlan) ? support.actionPlan.slice(0, 3) : [],
      journalPrompt: String(support.journalPrompt || ""),
      groundingExercise: String(support.groundingExercise || ""),
      nextActions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error", details: String(err?.message ?? err) }, { status: 500 });
  }
}
