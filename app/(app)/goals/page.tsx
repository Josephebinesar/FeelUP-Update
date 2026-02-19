"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import StreakDisplay from "@/components/StreakDisplay";
import {
  Target,
  Flame,
  CheckCircle2,
  Trophy,
  Share2,
  Plus,
  Trash2,
} from "lucide-react";

/* -------------------- CONFIG -------------------- */

const goalCategories = [
  { value: "study", label: "Study" },
  { value: "exercise", label: "Exercise" },
  { value: "wellness", label: "Wellness" },
  { value: "social", label: "Social" },
  { value: "creative", label: "Creative" },
  { value: "personal", label: "Personal" },
];

const completionMoods = [
  { value: "accomplished", emoji: "🎉", label: "Accomplished", color: "#fbbf24" },
  { value: "proud", emoji: "😊", label: "Proud", color: "#f472b6" },
  { value: "relieved", emoji: "😌", label: "Relieved", color: "#60a5fa" },
  { value: "energized", emoji: "⚡", label: "Energized", color: "#34d399" },
  { value: "calm", emoji: "🕊️", label: "Calm", color: "#60a5fa" },
  { value: "grateful", emoji: "🙏", label: "Grateful", color: "#34d399" },
];

type Visibility = "public" | "followers" | "mutuals";

type CompletedDraft = {
  goal: any;
  mood: string;
  reflection: string;
};

export default function GoalsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [goals, setGoals] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState("");

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  const [streakRefreshKey, setStreakRefreshKey] = useState(0);

  // prevent double click completes
  const [completingIds, setCompletingIds] = useState<Record<string, boolean>>(
    {}
  );

  // optional reflection modal after instant complete
  const [completionModal, setCompletionModal] = useState<CompletedDraft | null>(
    null
  );

  // Share completed goal → Mood Feed (optional)
  const [shareToFeed, setShareToFeed] = useState(false);
  const [shareVisibility, setShareVisibility] = useState<Visibility>("public");
  const [shareAnonymous, setShareAnonymous] = useState(false);

  /* -------------------- HELPERS -------------------- */

  const todayISO = () => new Date().toISOString().split("T")[0];
  const safeDate = selectedDate || todayISO();

  const completedGoals = goals.filter((g) => g.completed_at);
  const pendingGoals = goals.filter((g) => !g.completed_at);

  const completionRate =
    goals.length > 0
      ? Math.round((completedGoals.length / goals.length) * 100)
      : 0;

  /* -------------------- AUTH -------------------- */

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data?.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setSelectedDate(todayISO());
      setLoading(false);
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* -------------------- LOAD GOALS -------------------- */

  const loadGoals = useCallback(
    async (date = safeDate) => {
      if (!user?.email) return;

      const res = await fetch(
        `/api/goals?user_email=${encodeURIComponent(user.email)}&date=${encodeURIComponent(
          date
        )}`
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("loadGoals failed:", res.status, text);
        return;
      }

      const data = await res.json();
      setGoals(data.goals || []);
    },
    [user?.email, safeDate]
  );

  useEffect(() => {
    if (user?.email && selectedDate) loadGoals(selectedDate);
  }, [user?.email, selectedDate, loadGoals]);

  /* -------------------- DATE -------------------- */

  const changeDateBy = async (days: number) => {
    const d = new Date(safeDate);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().split("T")[0];
    setSelectedDate(next);
    await loadGoals(next);
  };

  /* -------------------- ADD GOAL -------------------- */

  const addGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;

    const fd = new FormData(e.currentTarget);

    const payload = {
      user_email: user.email,
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      category: String(fd.get("category") || ""),
      target_date: safeDate,
    };

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`Failed to add goal (${res.status}): ${text || "Unknown error"}`);
      return;
    }

    setShowAddGoal(false);
    await loadGoals(safeDate);
  };

  const addGoalsBulk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;

    const fd = new FormData(e.currentTarget);
    const raw = String(fd.get("bulk") || "");
    const category = String(fd.get("category") || "");
    const description = String(fd.get("description") || "");

    const titles = raw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    if (titles.length === 0) {
      alert("Add at least 1 goal (one per line)");
      return;
    }

    for (const title of titles) {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: user.email,
          title,
          description,
          category,
          target_date: safeDate,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        alert(`Bulk add failed (${res.status}): ${text || "Unknown error"}`);
        break;
      }
    }

    setShowAddGoal(false);
    setBulkMode(false);
    await loadGoals(safeDate);
  };

  /* -------------------- DELETE GOAL -------------------- */

  const deleteGoal = async (id: string) => {
    if (!user?.email) return;
    if (!confirm("Delete this goal?")) return;

    const res = await fetch(
      `/api/goals?goal_id=${encodeURIComponent(id)}&user_email=${encodeURIComponent(
        user.email
      )}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`Failed to delete (${res.status}): ${text || "Unknown error"}`);
      return;
    }

    await loadGoals(safeDate);
  };

  /* -------------------- SHARE TO FEED -------------------- */

  const shareCompletedGoalToFeed = async (
    goal: any,
    moodValue: string,
    reflection: string
  ) => {
    if (!user?.id) throw new Error("User not ready");

    const moodMeta =
      completionMoods.find((m) => m.value === moodValue) || completionMoods[0];

    const lines: string[] = [];
    lines.push(`✅ Completed my goal: ${goal.title}`);
    if (goal.category) lines.push(`Category: ${goal.category}`);
    if (reflection?.trim()) lines.push(`Reflection: ${reflection.trim()}`);

    const content = lines.join("\n");

    const { error } = await supabase.from("mood_posts").insert({
      owner_id: user.id,
      content,
      mood: moodMeta.label,
      mood_emoji: moodMeta.emoji,
      mood_color: moodMeta.color,
      anonymous: shareAnonymous,
      visibility: shareVisibility,
      image_url: null,
    });

    if (error) throw new Error(error.message || "Failed to share to feed");
  };

  /* -------------------- STREAK -------------------- */

  const recordGoalStreakActivity = async () => {
    if (!user?.id) return;

    const res = await fetch("/api/streaks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        streak_type: "goals",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("streak update failed:", res.status, text);
    }
  };

  /* -------------------- COMPLETE GOAL -------------------- */

  const completeGoal = async (goal: any) => {
    if (!user?.email) return;

    if (completingIds[goal.id]) return;
    setCompletingIds((p) => ({ ...p, [goal.id]: true }));

    // optimistic UI
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, completed_at: new Date().toISOString() } : g
      )
    );

    const defaultMood = "accomplished";

    const res = await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_id: goal.id,
        user_email: user.email,
        completed: true,
        mood_at_completion: defaultMood,
        reflection_note: "",
      }),
    });

    setCompletingIds((p) => {
      const copy = { ...p };
      delete copy[goal.id];
      return copy;
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`Failed to complete goal (${res.status}): ${text || "Unknown error"}`);
      await loadGoals(safeDate);
      return;
    }

    await recordGoalStreakActivity();
    setStreakRefreshKey((k) => k + 1);

    setCompletionModal({ goal, mood: defaultMood, reflection: "" });
    await loadGoals(safeDate);
  };

  const saveReflectionAndShare = async () => {
    if (!completionModal || !user?.email) return;

    const { goal, mood, reflection } = completionModal;

    const res = await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_id: goal.id,
        user_email: user.email,
        completed: true,
        mood_at_completion: mood,
        reflection_note: reflection,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`Failed to save (${res.status}): ${text || "Unknown error"}`);
      return;
    }

    if (shareToFeed) {
      try {
        await shareCompletedGoalToFeed(goal, mood, reflection);
      } catch (e: any) {
        alert(e?.message || "Failed to share to feed");
      }
    }

    setCompletionModal(null);
    setShareToFeed(false);
    setShareVisibility("public");
    setShareAnonymous(false);

    await loadGoals(safeDate);
  };

  /* -------------------- UI -------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading goals…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-7 h-7 text-blue-500" />
        <h1 className="text-3xl font-bold">Daily Goals</h1>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat icon={<Flame />} label="Streak">
          <StreakDisplay
            userId={user.id}
            streakType="goals"
            refreshKey={streakRefreshKey}
          />
        </Stat>

        <Stat icon={<CheckCircle2 />} label="Completed">
          {completedGoals.length}/{goals.length || 1}
        </Stat>

        <Stat icon={<Trophy />} label="Rate">
          {completionRate}%
        </Stat>
      </div>

      {/* DATE */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => changeDateBy(-1)}
          className="px-2 py-1 rounded border bg-white"
        >
          ◀
        </button>

        <input
          type="date"
          className="border rounded px-2 py-1 bg-white"
          value={safeDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            loadGoals(e.target.value);
          }}
        />

        <button
          onClick={() => changeDateBy(1)}
          className="px-2 py-1 rounded border bg-white"
        >
          ▶
        </button>
      </div>

      {/* ADD GOAL */}
      {!showAddGoal ? (
        <button
          onClick={() => {
            setShowAddGoal(true);
            setBulkMode(false);
          }}
          className="mb-6 px-4 py-2 rounded bg-blue-600 text-white inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      ) : (
        <div className="mb-6 bg-white p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Add goals</div>
            <button
              onClick={() => setBulkMode((v) => !v)}
              className="text-sm text-blue-600 hover:underline"
              type="button"
            >
              {bulkMode ? "Switch to single add" : "Bulk add (multiple)"}
            </button>
          </div>

          {!bulkMode ? (
            <form onSubmit={addGoal} className="space-y-3">
              <input
                name="title"
                required
                placeholder="Goal title"
                className="w-full border rounded px-3 py-2"
              />
              <textarea
                name="description"
                placeholder="Optional notes"
                className="w-full border rounded px-3 py-2"
              />
              <select
                name="category"
                required
                className="w-full border rounded px-3 py-2"
              >
                {goalCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="px-4 py-2 rounded border bg-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={addGoalsBulk} className="space-y-3">
              <textarea
                name="bulk"
                required
                placeholder={
                  "Enter one goal per line:\nStudy DSA 30 mins\nWalk 15 mins\nDrink 2L water"
                }
                className="w-full border rounded px-3 py-2 min-h-[120px]"
              />
              <textarea
                name="description"
                placeholder="Optional notes (applies to all)"
                className="w-full border rounded px-3 py-2"
              />
              <select
                name="category"
                required
                className="w-full border rounded px-3 py-2"
              >
                {goalCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white"
                >
                  Add all
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="px-4 py-2 rounded border bg-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TODAY GOALS */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">
          Today’s goals{" "}
          <span className="text-sm text-gray-500">
            ({pendingGoals.length} pending)
          </span>
        </h2>

        {pendingGoals.length === 0 ? (
          <div className="text-gray-500">
            No pending goals for this day — add one!
          </div>
        ) : (
          pendingGoals.map((goal) => (
            <div
              key={goal.id}
              className="w-full bg-white p-4 rounded-xl border flex items-center justify-between mb-2"
            >
              <div>
                <div className="font-medium">{goal.title}</div>
                {goal.category && (
                  <div className="text-xs text-gray-500">
                    Category: {goal.category}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => completeGoal(goal)}
                  disabled={!!completingIds[goal.id]}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    completingIds[goal.id]
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  ✓ Complete
                </button>

                <button
                  type="button"
                  onClick={() => deleteGoal(goal.id)}
                  className="p-2 rounded border bg-white hover:bg-gray-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* COMPLETED */}
      {completedGoals.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">
            Completed{" "}
            <span className="text-sm text-gray-500">
              ({completedGoals.length})
            </span>
          </h2>

          <div className="space-y-2">
            {completedGoals.map((g) => (
              <div
                key={g.id}
                className="bg-white p-3 rounded-xl border text-sm text-gray-700"
              >
                ✅ {g.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OPTIONAL REFLECTION + SHARE MODAL */}
      {completionModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4 border">
            <div className="text-lg font-semibold">
              ✅ Completed: {completionModal.goal.title}
            </div>

            <div className="text-sm text-gray-600">
              Want to add a reflection or share it? (Optional)
            </div>

            <select
              className="w-full border rounded px-3 py-2"
              value={completionModal.mood}
              onChange={(e) =>
                setCompletionModal((p) =>
                  p ? { ...p, mood: e.target.value } : p
                )
              }
            >
              {completionMoods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>

            <textarea
              className="w-full border rounded px-3 py-2"
              placeholder="Reflection (optional)"
              value={completionModal.reflection}
              onChange={(e) =>
                setCompletionModal((p) =>
                  p ? { ...p, reflection: e.target.value } : p
                )
              }
            />

            <div className="border rounded-lg p-3 bg-gray-50">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shareToFeed}
                  onChange={(e) => setShareToFeed(e.target.checked)}
                />
                <span className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share as motivational post
                </span>
              </label>

              {shareToFeed && (
                <div className="mt-3 space-y-2">
                  <select
                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                    value={shareVisibility}
                    onChange={(e) =>
                      setShareVisibility(e.target.value as Visibility)
                    }
                  >
                    <option value="public">Public</option>
                    <option value="followers">Friend circle (followers)</option>
                    <option value="mutuals">Close friends (mutuals)</option>
                  </select>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={shareAnonymous}
                      onChange={(e) => setShareAnonymous(e.target.checked)}
                    />
                    Share anonymously
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setCompletionModal(null);
                  setShareToFeed(false);
                  setShareVisibility("public");
                  setShareAnonymous(false);
                }}
                className="px-4 py-2 rounded border bg-white"
              >
                Skip
              </button>

              <button
                type="button"
                onClick={saveReflectionAndShare}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- STAT CARD -------------------- */

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-4 text-center border">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xl font-bold">{children}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
