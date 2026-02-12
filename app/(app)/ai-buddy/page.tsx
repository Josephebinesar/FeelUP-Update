"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  RefreshCw,
  SendHorizontal,
  ChevronUp,
  ChevronDown,
  Clipboard,
  Check,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; created_at?: string };
type Task = { title: string; minutes?: number | null };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Toast({ text }: { text: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full border bg-white px-4 py-2 text-sm shadow">
      {text}
    </div>
  );
}

export default function AIBuddyPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const sp = useSearchParams();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);

  // Locked = AI stops. Chat becomes “psychologist chat”.
  const [locked, setLocked] = useState(false);
  const [lockedTicketId, setLockedTicketId] = useState<string | null>(null);

  // If Level-5 happened but no ticket exists yet (auth not ready), user must login + connect.
  const [pendingEscalation, setPendingEscalation] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi, I’m FeelUp Support Buddy.\nYou can share what you’re feeling and I’ll help you step-by-step.\n\nI’m not a doctor—just an assistant.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [escalated, setEscalated] = useState(false);
  const [severity, setSeverity] = useState<number | null>(null);

  const [plan, setPlan] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<any>(null);

  const [copied, setCopied] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const quickPrompts = [
    "I just had a breakup and I can’t stop thinking about them.",
    "I feel anxious and my mind is racing.",
    "I feel lonely and I don’t have anyone to talk to.",
    "I can’t sleep and I feel stressed.",
  ];

  function showToast(text: string) {
    setToast(text);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 1400);
  }

  // Read URL params (coming back from waiting room)
  useEffect(() => {
    const lockFlag = sp.get("locked") === "1";
    const tId = sp.get("ticketId");
    const sId = sp.get("sessionId");

    if (lockFlag) setLocked(true);
    if (tId) setLockedTicketId(tId);
    if (sId) setSessionId(sId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${clamp(ta.scrollHeight, 44, 140)}px`;
  }, [input]);

  // Resume session from localStorage
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("feelup_ai_session")
        : null;
    if (saved && !sessionId) setSessionId(saved);
  }, [sessionId]);

  // Load previous messages (if logged in)
  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem("feelup_ai_session", sessionId);

    (async () => {
      const { data: auth } = await supabase.auth.getSession();
      const token = auth.session?.access_token;
      if (!token) return;

      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) return;

      if (data && data.length > 0) {
        const normalized = (data as any[]).filter(
          (m) => m.role === "user" || m.role === "assistant"
        );
        if (normalized.length > 0) setMessages(normalized as Msg[]);
      }
    })();
  }, [sessionId, supabase]);

  // Realtime updates (psychologist replies, etc.)
  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase
      .channel(`ai-buddy-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.role === "user" || row?.role === "assistant") {
            setMessages((prev) => [
              ...prev,
              { role: row.role, content: row.content, created_at: row.created_at },
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, supabase]);

  /**
   * ✅ Auto-unlock when ticket resolved/closed
   * Also adds a friendly system message into chat.
   */
  useEffect(() => {
    if (!locked || !lockedTicketId) return;

    let stop = false;
    let timer: any = null;

    (async function poll() {
      if (stop) return;

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? null;
        if (!token) {
          timer = setTimeout(poll, 2500);
          return;
        }

        const res = await fetch("/api/support/ticket-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ticketId: lockedTicketId }),
        });

        const json = await res.json().catch(() => ({} as any));
        if (res.ok) {
          const st = String(json.status || "");
          if (st === "resolved" || st === "closed") {
            setLocked(false);
            setLockedTicketId(null);
            setPendingEscalation(false);
            setEscalated(false);

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  "✅ Session ended by psychologist. You can continue with AI Buddy normally.",
              },
            ]);

            showToast("Session ended. AI Buddy resumed.");
            return;
          }
        }
      } catch {
        // ignore
      }

      timer = setTimeout(poll, 2500);
    })();

    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [locked, lockedTicketId, supabase]);

  function startNewChat() {
    setSessionId(null);
    localStorage.removeItem("feelup_ai_session");
    setSeverity(null);
    setEscalated(false);
    setPlan([]);
    setTasks([]);
    setDrawerOpen(false);
    setInput("");
    setLocked(false);
    setLockedTicketId(null);
    setPendingEscalation(false);
    setMessages([
      {
        role: "assistant",
        content:
          "New chat started.\nWhat’s on your mind right now?\n\nI’m not a doctor—just an assistant.",
      },
    ]);
    showToast("New chat");
  }

  async function addTaskToApp(task: Task) {
    try {
      const { data: s } = await supabase.auth.getSession();
      const user = s.session?.user;

      if (!user) {
        showToast("Login to save tasks");
        return;
      }

      const tryAi = await supabase.from("ai_tasks").insert({
        user_id: user.id,
        title: task.title,
        minutes: task.minutes ?? null,
        source: "ai_buddy",
      });

      if (!tryAi.error) {
        showToast("Task saved ✅");
        return;
      }

      await navigator.clipboard.writeText(task.title);
      showToast("Copied ✅");
    } catch {
      await navigator.clipboard.writeText(task.title);
      showToast("Copied ✅");
    }
  }

  async function copyLastReply() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last?.content) return;
    await navigator.clipboard.writeText(last.content);
    setCopied(true);
    showToast("Copied");
    setTimeout(() => setCopied(false), 800);
  }

  async function connectToPsychologist() {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;

      if (!token) {
        showToast("Please login first");
        return;
      }
      if (!sessionId) {
        showToast("Missing sessionId");
        return;
      }

      const res = await fetch("/api/support/create-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, severity: 5 }),
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(j?.error || "Create ticket failed");
      if (!j.ticketId) throw new Error("Missing ticketId from server");

      setLockedTicketId(j.ticketId);
      setPendingEscalation(false);

      window.location.href = `/support/waiting?ticketId=${encodeURIComponent(
        j.ticketId
      )}&sessionId=${encodeURIComponent(sessionId)}`;
    } catch (e: any) {
      showToast(String(e?.message ?? e));
    }
  }

  async function send(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    setInput("");

    // ✅ LOCKED MODE: AI stops. User messages go to chat_messages for psychologist.
    if (locked) {
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      const { data: s } = await supabase.auth.getSession();
      const user = s.session?.user;

      if (!user) {
        showToast("Login needed to message psychologist");
        return;
      }
      if (!sessionId) {
        showToast("Missing session");
        return;
      }

      const ins = await supabase.from("chat_messages").insert({
        session_id: sessionId,
        user_id: user.id,
        role: "user",
        content: text,
      });

      if (ins.error) showToast(ins.error.message);
      return;
    }

    // Normal AI mode
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth.session?.access_token ?? null;

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          message: text,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const details =
          json?.details?.message ||
          json?.details?.hint ||
          (typeof json?.details === "string" ? json.details : "") ||
          JSON.stringify(json?.details || json || {}, null, 2);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ API Error: ${json?.error || "Request failed"}\n\nDetails:\n${details}`,
          },
        ]);

        throw new Error(json?.error || "Failed");
      }

      if (!sessionId && json.sessionId) {
        setSessionId(json.sessionId);
        localStorage.setItem("feelup_ai_session", json.sessionId);
      }

      setSeverity(typeof json.severity === "number" ? json.severity : null);
      setEscalated(Boolean(json.escalated));
      setPlan(Array.isArray(json.plan) ? json.plan : []);
      setTasks(Array.isArray(json.tasks) ? json.tasks : []);

      const hasExtras =
        (Array.isArray(json.plan) && json.plan.length > 0) ||
        (Array.isArray(json.tasks) && json.tasks.length > 0);
      if (hasExtras) setDrawerOpen(true);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(json.reply || "") },
      ]);

      // ✅ Level 5: STOP AI immediately
      if (json.escalated && typeof json.severity === "number" && json.severity >= 5) {
        setLocked(true);

        // If ticket exists, go waiting
        if (json.ticketId && json.sessionId) {
          setLockedTicketId(json.ticketId);
          window.location.href = `/support/waiting?ticketId=${encodeURIComponent(
            json.ticketId
          )}&sessionId=${encodeURIComponent(json.sessionId)}`;
          return;
        }

        // If no ticket yet: require login + connect button
        setLockedTicketId(null);
        setPendingEscalation(true);
        showToast("Login + connect to psychologist");
      }
    } catch (e: any) {
      console.error("AI Buddy send() error:", e);
      const msg = e?.message || (typeof e === "string" ? e : "Unknown error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `ERROR: ${msg}` },
      ]);
      showToast(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const severityText =
    severity === null ? "—" : severity >= 5 ? "High" : severity >= 3 ? "Medium" : "Low";

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      {toast ? <Toast text={toast} /> : null}

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-lg font-semibold">AI Buddy</div>
            <div className="text-xs text-gray-600">
              Not a doctor — if immediate danger, contact local emergency services.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLastReply}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              Copy
            </button>

            <button
              onClick={startNewChat}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              New
            </button>
          </div>
        </div>

        {/* Locked banner */}
        {locked ? (
          <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            You are being connected to a psychologist. The AI will not reply anymore.
            {lockedTicketId ? (
              <div className="mt-1 text-xs text-blue-900/70">
                Ticket: <span className="font-mono">{lockedTicketId.slice(0, 8)}…</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Pending escalation banner: login + connect */}
        {locked && pendingEscalation ? (
          <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
            To connect you with a psychologist, please login and press{" "}
            <b>Connect to psychologist</b>.
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => router.push("/login")}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm"
                type="button"
              >
                Login
              </button>

              <button
                onClick={connectToPsychologist}
                className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                type="button"
              >
                Connect to psychologist
              </button>
            </div>
          </div>
        ) : null}

        {/* Compact status row */}
        <div className="mb-3 flex items-center justify-between rounded-xl border bg-white px-3 py-2">
          <div className="text-xs text-gray-700">
            Severity: <span className="font-semibold">{severityText}</span>
          </div>

          {escalated ? (
            <div className="text-xs rounded-full bg-red-50 text-red-700 px-2 py-1 border border-red-200">
              Escalation
            </div>
          ) : (
            <div className="text-xs rounded-full bg-green-50 text-green-700 px-2 py-1 border border-green-200">
              Support
            </div>
          )}
        </div>

        {/* Suggestions toggle */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowPrompts((v) => !v)}
            className="text-sm text-gray-700 hover:underline"
          >
            {showPrompts ? "Hide suggestions" : "Show suggestions"}
          </button>

          {showPrompts ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  disabled={loading}
                  className="rounded-full border bg-white px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                >
                  {p.length > 38 ? p.slice(0, 38) + "…" : p}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Chat card */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div ref={listRef} className="h-[60vh] overflow-y-auto p-4 space-y-3">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={cx("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cx(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm",
                      isUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-gray-100 text-gray-900">
                  Typing…
                </div>
              </div>
            ) : null}
          </div>

          {/* Composer */}
          <div className="border-t p-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                placeholder={
                  locked
                    ? "Message (psychologist will respond)…"
                    : "Share what you're feeling…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
              />

              <button
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 inline-flex items-center gap-2"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                type="button"
              >
                <SendHorizontal className="h-4 w-4" />
                Send
              </button>
            </div>

            {escalated ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                If you feel unsafe, please contact local emergency services or a trusted person now.
              </div>
            ) : null}
          </div>
        </div>

        {/* Plan + Tasks drawer (hidden in locked mode) */}
        {(plan.length > 0 || tasks.length > 0) && !locked ? (
          <div className="mt-3 rounded-2xl border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="text-sm font-semibold">Your plan & tasks</div>
              {drawerOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>

            {drawerOpen ? (
              <div className="px-4 pb-4 space-y-4">
                {plan.length > 0 ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-700">
                      Plan
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-gray-900 space-y-1">
                      {plan.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {tasks.length > 0 ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-700">
                      Tasks
                    </div>
                    <div className="mt-2 space-y-2">
                      {tasks.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl border bg-gray-50 px-3 py-2"
                        >
                          <div className="text-sm text-gray-900">
                            {t.title}
                            {typeof t.minutes === "number" ? (
                              <span className="ml-2 text-xs text-gray-500">
                                ({t.minutes} min)
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="text-xs rounded-lg border bg-white px-2 py-1 hover:bg-gray-50"
                            onClick={() => addTaskToApp(t)}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
