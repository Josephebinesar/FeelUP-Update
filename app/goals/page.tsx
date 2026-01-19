"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import StreakDisplay from "@/components/StreakDisplay";
import { Target, Flame, CheckCircle2, Trophy } from "lucide-react";

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
  { value: "accomplished", emoji: "🎉", label: "Accomplished" },
  { value: "proud", emoji: "😊", label: "Proud" },
  { value: "relieved", emoji: "😌", label: "Relieved" },
  { value: "energized", emoji: "⚡", label: "Energized" },
  { value: "calm", emoji: "🕊️", label: "Calm" },
  { value: "grateful", emoji: "🙏", label: "Grateful" },
];

/* -------------------- PAGE -------------------- */

export default function GoalsPage() {
  const router = useRouter();

  // ✅ SAFE SINGLETON (matches lib/supabaseClient.ts)
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [completingGoal, setCompletingGoal] = useState<any>(null);
  const [streakRefreshKey, setStreakRefreshKey] = useState(0);

  /* -------------------- AUTH -------------------- */

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setSelectedDate(new Date().toISOString().split("T")[0]);
      setLoading(false);
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* -------------------- LOAD GOALS -------------------- */

  const loadGoals = useCallback(
    async (date = selectedDate) => {
      if (!user?.email) return;

      const res = await fetch(
        `/api/goals?user_email=${encodeURIComponent(
          user.email
        )}&date=${date}`
      );

      if (!res.ok) return;

      const data = await res.json();
      setGoals(data.goals || []);
    },
    [user?.email, selectedDate]
  );

  useEffect(() => {
    if (user?.email) loadGoals();
  }, [user?.email, loadGoals]);

  /* -------------------- HELPERS -------------------- */

  const completedGoals = goals.filter((g) => g.completed_at);
  const pendingGoals = goals.filter((g) => !g.completed_at);

  const completionRate =
    goals.length > 0
      ? Math.round((completedGoals.length / goals.length) * 100)
      : 0;

  const changeDateBy = async (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().split("T")[0];
    setSelectedDate(next);
    await loadGoals(next);
  };

  /* -------------------- CRUD -------------------- */

  const addGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: user.email,
        title: fd.get("title"),
        description: fd.get("description"),
        category: fd.get("category"),
        target_date: selectedDate,
      }),
    });

    setShowAddGoal(false);
    loadGoals();
  };

  const completeGoal = async (
    goal: any,
    mood: string,
    reflection: string
  ) => {
    await fetch("/api/goals", {
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

    setCompletingGoal(null);
    setStreakRefreshKey((k) => k + 1);
    loadGoals();
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;

    await fetch(
      `/api/goals?goal_id=${id}&user_email=${user.email}`,
      { method: "DELETE" }
    );

    loadGoals();
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
            userEmail={user.email}
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
        <button onClick={() => changeDateBy(-1)}>◀</button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            loadGoals(e.target.value);
          }}
        />
        <button onClick={() => changeDateBy(1)}>▶</button>
      </div>

      {/* ADD GOAL */}
      {!showAddGoal ? (
        <button onClick={() => setShowAddGoal(true)}>+ Add Goal</button>
      ) : (
        <form onSubmit={addGoal} className="space-y-3 mb-6">
          <input name="title" required placeholder="Goal title" />
          <textarea name="description" placeholder="Optional notes" />
          <select name="category" required>
            {goalCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button type="submit">Save</button>
        </form>
      )}

      {/* GOALS */}
      {pendingGoals.map((goal) => (
        <div
          key={goal.id}
          className="bg-white p-4 rounded flex justify-between mb-2"
        >
          <span>{goal.title}</span>
          <div className="flex gap-2">
            <button onClick={() => setCompletingGoal(goal)}>✓</button>
            <button onClick={() => deleteGoal(goal.id)}>🗑</button>
          </div>
        </div>
      ))}

      {/* COMPLETION MODAL */}
      {completingGoal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              completeGoal(
                completingGoal,
                fd.get("mood") as string,
                fd.get("reflection") as string
              );
            }}
            className="bg-white p-6 rounded space-y-3"
          >
            <select name="mood" required>
              {completionMoods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
            <textarea name="reflection" placeholder="Reflection" />
            <button type="submit">Complete</button>
          </form>
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
    <div className="bg-white rounded-xl p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xl font-bold">{children}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
