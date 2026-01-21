"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { BarChart3, Zap, Flame, CalendarDays, History } from "lucide-react";

type Timeframe = "week" | "month" | "quarter";

type TimelineRow = {
  day: string;
  mood_posts: number;
  positive_posts: number;
  positive_percent: number;
  avg_energy: number;
  goals_completed: number;
};

type MoodDistributionRow = {
  mood: string;
  posts_count: number;
  percent: number;
};

type MemoryLaneRow = {
  kind: "mood_post" | "journal";
  id: string;
  created_at: string;
  title: string | null;
  content: string | null;
  mood: string | null;
};

type Insights = {
  days_back: number;
  total_posts: number;
  top_mood: string;
  avg_energy: number;
  weekend_positive_percent: number;
  weekday_positive_percent: number;
  best_day_of_week: string;
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

function daysFromTimeframe(t: Timeframe) {
  if (t === "week") return 7;
  if (t === "quarter") return 90;
  return 30;
}

function fmtDay(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeErrMsg(e: any) {
  return (
    (typeof e?.message === "string" && e.message) ||
    (typeof e === "string" && e) ||
    "Unknown error"
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [distribution, setDistribution] = useState<MoodDistributionRow[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [memoryLane, setMemoryLane] = useState<MemoryLaneRow[]>([]);

  const [stats, setStats] = useState({
    moodStreak: 0,
    goalsCompleted: 0,
    totalMoodPosts: 0,
    positivePercent: 0,
    avgEnergy: 0,
    topMood: "N/A",
  });

  // ✅ prevents overlapping loads (realtime + refresh)
  const inFlightRef = useRef(false);

  const loadAll = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const days_back = daysFromTimeframe(timeframe);
    setErrorMsg(null);
    setLoading(true);

    try {
      // auth guard
      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      if (!authRes.user) {
        router.replace("/login");
        return;
      }

      // 1) correlation timeline
      const corr = await supabase.rpc("get_my_mood_goal_correlation", { days_back });
      if (corr.error) throw corr.error;
      const corrRows = (corr.data || []) as TimelineRow[];
      setTimeline(corrRows);

      // 2) mood distribution
      const dist = await supabase.rpc("get_my_mood_distribution", { days_back });
      if (dist.error) throw dist.error;
      const distRows = (dist.data || []) as MoodDistributionRow[];
      setDistribution(distRows);

      // 3) insights
      const ins = await supabase.rpc("get_my_emotional_insights", { days_back });
      if (ins.error) throw ins.error;
      const insRow = ins.data as Insights;
      setInsights(insRow);

      // 4) memory lane (optional)
      const mem = await supabase.rpc("get_my_memory_lane", { days_back: Math.max(days_back, 90) });
      if (mem.error) {
        // keep UI alive if missing journal table/function
        setMemoryLane([]);
      } else {
        setMemoryLane((mem.data || []) as MemoryLaneRow[]);
      }

      // derive stats
      const totalMoodPosts = corrRows.reduce((s, r) => s + (r.mood_posts || 0), 0);
      const goalsCompleted = corrRows.reduce((s, r) => s + (r.goals_completed || 0), 0);
      const positivePosts = corrRows.reduce((s, r) => s + (r.positive_posts || 0), 0);

      const avgEnergy =
        corrRows.length > 0
          ? Math.round((corrRows.reduce((s, r) => s + (r.avg_energy || 0), 0) / corrRows.length) * 10) / 10
          : 0;

      const positivePercent = totalMoodPosts === 0 ? 0 : Math.round((positivePosts / totalMoodPosts) * 100);

      // streak = consecutive days with >=1 post ending today
      let streak = 0;
      for (let i = corrRows.length - 1; i >= 0; i--) {
        if ((corrRows[i]?.mood_posts || 0) > 0) streak++;
        else break;
      }

      // ✅ top mood from dist rows, fallback to insights
      const topMood = distRows?.[0]?.mood || insRow?.top_mood || "N/A";

      setStats({
        moodStreak: streak,
        goalsCompleted,
        totalMoodPosts,
        positivePercent,
        avgEnergy,
        topMood,
      });
    } catch (e: any) {
      setErrorMsg(safeErrMsg(e));
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [router, supabase, timeframe]); // ✅ removed distribution from deps

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // realtime: refresh on changes (but won’t overlap due to inFlightRef)
  useEffect(() => {
    const ch = supabase
      .channel("analytics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "mood_posts" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_completions" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries" }, () => loadAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, loadAll]);

  const maxGoals = Math.max(1, ...timeline.map((r) => r.goals_completed || 0));
  const maxEnergy = 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">Your Analytics</h1>
            </div>
            <p className="text-gray-600">Realtime insights from your wellness journey (only you can see this).</p>
          </div>

          <div className="bg-white rounded-2xl p-2 shadow-sm border flex gap-2">
            {(["week", "month", "quarter"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTimeframe(p)}
                className={`px-4 py-2 rounded-xl capitalize text-sm font-semibold transition ${
                  timeframe === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
                type="button"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="bg-white border rounded-2xl p-5 shadow-sm mb-6">
            <div className="font-semibold text-red-600">Analytics failed to load</div>
            <div className="text-sm text-gray-600 mt-1">{errorMsg}</div>
            <div className="text-xs text-gray-500 mt-2">
              Tip: Open DevTools → Network → look for <b>/rest/v1/rpc/...</b> calls and tell me which one fails (404/401/500).
            </div>
            <button
              onClick={loadAll}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-8 text-gray-600">Loading analytics…</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard icon={<Flame className="w-4 h-4" />} label="Mood Streak" value={`${stats.moodStreak} days`} />
              <StatCard icon={<Zap className="w-4 h-4" />} label="Avg Energy" value={`${stats.avgEnergy}/5`} />
              <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Mood Posts" value={stats.totalMoodPosts} />
              <StatCard icon={<CalendarDays className="w-4 h-4" />} label="Goals Done" value={stats.goalsCompleted} />
              <StatCard icon={<Zap className="w-4 h-4" />} label="Positive" value={`${stats.positivePercent}%`} />
              <StatCard icon={<History className="w-4 h-4" />} label="Top Mood" value={stats.topMood} />
            </div>

            {/* Insights */}
            {insights && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-3">🧠 Emotional Insights</h2>
                <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
                  <InsightLine label="Top mood" value={insights.top_mood} />
                  <InsightLine label="Best day of week" value={insights.best_day_of_week} />
                  <InsightLine label="Weekend positivity" value={`${insights.weekend_positive_percent}%`} />
                  <InsightLine label="Weekday positivity" value={`${insights.weekday_positive_percent}%`} />
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Timeline */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h2 className="font-bold mb-4">Mood + Energy Timeline</h2>

                {timeline.slice(-14).map((d, i) => {
                  const energyPct = clamp(((d.avg_energy || 0) / maxEnergy) * 100, 0, 100);
                  const goalsPct = clamp(((d.goals_completed || 0) / maxGoals) * 100, 0, 100);

                  return (
                    <div key={i} className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span className="font-medium">{fmtDay(d.day)}</span>
                        <span>
                          Energy: {d.avg_energy || 0}/5 · Goals: {d.goals_completed || 0}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${energyPct}%` }} />
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${goalsPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 text-xs text-gray-500">Blue = energy · Green = goals completed</div>
              </div>

              {/* Distribution */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Mood Distribution
                </h2>

                {distribution.length === 0 ? (
                  <div className="text-sm text-gray-500">No mood posts yet.</div>
                ) : (
                  distribution.map((row) => {
                    const pct = clamp(row.percent || 0, 0, 100);
                    const color = moodColors[row.mood] || "#9ca3af";
                    return (
                      <div key={row.mood} className="flex items-center gap-3 mb-3">
                        <span className="w-24 text-sm text-gray-700">{row.mood}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-xs text-gray-600 w-20 text-right">
                          {row.posts_count} · {pct}%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Memory Lane */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">⏳ Memory Lane</h2>

              {memoryLane.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No memory lane items yet. (If you haven’t created <b>journal_entries</b>, you may only see mood posts.)
                </div>
              ) : (
                <div className="space-y-3">
                  {memoryLane.slice(0, 12).map((item) => (
                    <div key={item.kind + item.id} className="p-4 rounded-xl border bg-gray-50">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">
                          {item.kind === "mood_post" ? `Mood: ${item.title || item.mood || "Mood post"}` : "Journal"}
                        </span>
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      {item.content ? (
                        <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{item.content}</div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-500">(no text)</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: any; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl text-center shadow-sm border">
      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-blue-600">{value}</div>
    </div>
  );
}

function InsightLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-gray-50">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
