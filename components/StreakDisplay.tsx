"use client";

import { useEffect, useState } from "react";

interface StreakDisplayProps {
  userId: string; // ✅ changed from userEmail
  streakType: string;
  size?: "small" | "medium" | "large";
  refreshKey?: number;
}

export default function StreakDisplay({
  userId,
  streakType,
  size = "medium",
  refreshKey,
}: StreakDisplayProps) {
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, streakType, refreshKey]);

  const loadStreak = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/streaks?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to load streak:", res.status, data);
        setStreak(null);
        return;
      }

      const typeStreak = data.streaks?.find(
        (s: any) => s.streak_type === streakType
      );

      setStreak(typeStreak || null);
    } catch (e) {
      console.error("Failed to load streak:", e);
      setStreak(null);
    } finally {
      setLoading(false);
    }
  };

  // Optional helper: can be used from other components if you want to “record activity”
  const updateStreak = async () => {
    try {
      const res = await fetch("/api/streaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          streak_type: streakType,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to update streak:", res.status, data);
        return null;
      }

      setStreak(data.streak);
      return data.streak;
    } catch (e) {
      console.error("Failed to update streak:", e);
      return null;
    }
  };

  const getFireEmoji = (count: number) => {
    if (count >= 100) return "🏆";
    if (count >= 50) return "⭐";
    if (count >= 30) return "🔥🔥🔥";
    if (count >= 14) return "🔥🔥";
    if (count >= 7) return "🔥";
    if (count >= 3) return "✨";
    return "🌱";
  };

  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return "text-xs gap-1";
      case "large":
        return "text-lg gap-3";
      default:
        return "text-sm gap-2";
    }
  };

  const getNumberSize = () => {
    switch (size) {
      case "small":
        return "text-sm font-semibold";
      case "large":
        return "text-2xl font-bold";
      default:
        return "text-lg font-semibold";
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center ${getSizeClasses()}`}>
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  const currentCount = streak?.current_count || 0;
  const bestCount = streak?.best_count || 0;

  return (
    <div className={`flex items-center ${getSizeClasses()}`}>
      <span className="text-lg mr-2">{getFireEmoji(currentCount)}</span>

      <div className="flex items-center gap-3">
        <div
          className={`px-3 py-1 bg-[rgba(37,150,190,0.08)] rounded-full ${getNumberSize()} text-[var(--brand-blue)]`}
        >
          {currentCount} day{currentCount !== 1 ? "s" : ""}
        </div>

        {bestCount > currentCount && size !== "small" && (
          <div className="text-xs text-[var(--text-muted)]">
            Best: {bestCount}
          </div>
        )}
      </div>

      {size === "large" && (
        <div className="text-xs text-[var(--text-muted)] ml-3">
          {streakType} streak
        </div>
      )}
    </div>
  );
}
