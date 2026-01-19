"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { BarChart3, Zap } from "lucide-react";

/* ---------------- MOCK DATA ---------------- */

const generateMockMoodData = () => {
  const moods = [
    "Happy",
    "Calm",
    "Excited",
    "Grateful",
    "Thoughtful",
    "Sad",
    "Anxious",
    "Tired",
  ];

  const last30Days = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    last30Days.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      mood: moods[Math.floor(Math.random() * moods.length)],
      energy: Math.floor(Math.random() * 5) + 1,
      goals_completed: Math.floor(Math.random() * 4),
    });
  }

  return last30Days;
};

const moodColors: Record<string, string> = {
  Happy: "#fbbf24",
  Calm: "#60a5fa",
  Excited: "#f472b6",
  Grateful: "#34d399",
  Thoughtful: "#a78bfa",
  Sad: "#94a3b8",
  Anxious: "#fb7185",
  Tired: "#6b7280",
};

/* ---------------- PAGE ---------------- */

export default function AnalyticsPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("month");
  const [moodData, setMoodData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    currentStreak: 0,
    journalEntries: 0,
    avgMoodScore: 0,
    avgEnergyLevel: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAnalytics = useCallback(() => {
    if (!mounted) return;

    const data = generateMockMoodData();
    setMoodData(data);

    const positiveDays = data.filter(d =>
      ["Happy", "Calm", "Excited", "Grateful"].includes(d.mood)
    ).length;

    const avgEnergy =
      data.reduce((sum, d) => sum + d.energy, 0) / data.length;

    const completedGoals = data.reduce(
      (sum, d) => sum + d.goals_completed,
      0
    );

    setStats({
      totalGoals: completedGoals + 15,
      completedGoals,
      currentStreak: 10,
      journalEntries: 28,
      avgMoodScore: Math.round((positiveDays / data.length) * 100),
      avgEnergyLevel: Math.round(avgEnergy * 10) / 10,
    });
  }, [mounted]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, timeframe]);

  const moodCounts = moodData.reduce((acc: any, d) => {
    acc[d.mood] = (acc[d.mood] || 0) + 1;
    return acc;
  }, {});

  const topMood = Object.entries(moodCounts).sort(
    ([, a]: any, [, b]: any) => b - a
  )[0];

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">
                Your Analytics
              </h1>
            </div>
            <p className="text-gray-600">
              Insights from your wellness journey
            </p>
          </div>

          <div className="bg-white rounded-xl p-2 shadow">
            {(["week", "month", "quarter"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTimeframe(p)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  timeframe === p
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            ["Streak", stats.currentStreak],
            ["Goals", stats.completedGoals],
            ["Journal", stats.journalEntries],
            ["Positive", `${stats.avgMoodScore}%`],
            ["Energy", `${stats.avgEnergyLevel}/5`],
            ["Top Mood", topMood?.[0] ?? "N/A"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-6 rounded-xl text-center shadow">
              <div className="text-2xl font-bold text-blue-600">{value}</div>
              <div className="text-sm text-gray-600">{label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-xl shadow">
            <h2 className="font-bold mb-4">Mood Timeline</h2>
            {moodData.slice(-10).map((d, i) => (
              <div key={i} className="flex items-center gap-3 mb-2">
                <span className="w-16 text-sm">{d.date}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${(d.energy / 5) * 100}%`,
                      backgroundColor: moodColors[d.mood],
                    }}
                  />
                </div>
                <span className="text-sm w-20">{d.mood}</span>
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-xl shadow">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" /> Mood Distribution
            </h2>

            {Object.entries(moodCounts).map(([mood, count]: any) => (
              <div key={mood} className="flex items-center gap-3 mb-2">
                <span className="w-20 text-sm">{mood}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${(count / moodData.length) * 100}%`,
                      backgroundColor: moodColors[mood],
                    }}
                  />
                </div>
                <span className="text-sm">{count} days</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
