"use client";

import { useEffect, useState, useCallback } from "react";
import { // } from "///react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { Lock } from "lucide-react";

const achievementCategories = [
  {
    category: "streak",
    title: "Streak Master",
    icon: "🔥",
    description: "Build consistent daily habits",
  },
  {
    category: "goals",
    title: "Goal Crusher",
    icon: "🎯",
    description: "Complete your daily objectives",
  },
  {
    category: "social",
    title: "Community Star",
    icon: "⭐",
    description: "Engage with the FeelUp community",
  },
  {
    category: "wellness",
    title: "Wellness Warrior",
    icon: "🌱",
    description: "Focus on personal growth and mindfulness",
  },
];

const allPossibleAchievements = [
  // Streak achievements
  {
    category: "streak",
    name: "First Steps",
    emoji: "👣",
    description: "Complete your first goal",
    requirement: 1,
    points: 10,
  },
  {
    category: "streak",
    name: "Getting Started",
    emoji: "🌅",
    description: "3-day streak",
    requirement: 3,
    points: 25,
  },
  {
    category: "streak",
    name: "Building Momentum",
    emoji: "🚀",
    description: "7-day streak",
    requirement: 7,
    points: 50,
  },
  {
    category: "streak",
    name: "Habit Former",
    emoji: "🏆",
    description: "14-day streak",
    requirement: 14,
    points: 100,
  },
  {
    category: "streak",
    name: "Consistency King",
    emoji: "👑",
    description: "30-day streak",
    requirement: 30,
    points: 200,
  },

  // Goal achievements
  {
    category: "goals",
    name: "Goal Getter",
    emoji: "🎯",
    description: "Complete 10 goals",
    requirement: 10,
    points: 30,
  },
  {
    category: "goals",
    name: "Achiever",
    emoji: "🏅",
    description: "Complete 25 goals",
    requirement: 25,
    points: 75,
  },
  {
    category: "goals",
    name: "Super Achiever",
    emoji: "🎆",
    description: "Complete 50 goals",
    requirement: 50,
    points: 150,
  },
  {
    category: "goals",
    name: "Goal Master",
    emoji: "🏆",
    description: "Complete 100 goals",
    requirement: 100,
    points: 300,
  },

  // Social achievements
  {
    category: "social",
    name: "First Post",
    emoji: "📝",
    description: "Share your first mood post",
    requirement: 1,
    points: 15,
  },
  {
    category: "social",
    name: "Supportive Friend",
    emoji: "🤗",
    description: "Give 10 reactions",
    requirement: 10,
    points: 25,
  },
  {
    category: "social",
    name: "Community Helper",
    emoji: "🙏",
    description: "Leave 5 supportive comments",
    requirement: 5,
    points: 30,
  },
  {
    category: "social",
    name: "Mood Sharer",
    emoji: "😊",
    description: "Share 20 mood posts",
    requirement: 20,
    points: 60,
  },

  // Wellness achievements
  {
    category: "wellness",
    name: "Mindful Moment",
    emoji: "🧘",
    description: "Complete first journal entry",
    requirement: 1,
    points: 20,
  },
  {
    category: "wellness",
    name: "Gratitude Practice",
    emoji: "🙏",
    description: "Write 5 gratitude entries",
    requirement: 5,
    points: 40,
  },
  {
    category: "wellness",
    name: "Self Reflection",
    emoji: "🤔",
    description: "Write 20 journal entries",
    requirement: 20,
    points: 80,
  },
  {
    category: "wellness",
    name: "Wellness Journey",
    emoji: "🌈",
    description: "Track moods for 30 days",
    requirement: 30,
    points: 120,
  },
];

export default function AchievementsPage() {
  const supabase = //();
const [user, setUser] = useState<any>(null);

useEffect(() => {
  //.getUser().then(({ data }) => {
    if (!data.user) {
      router.push("/login");
    } else {
      setUser(data.user);
    }
  });
}, []);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [totalPoints, setTotalPoints] = useState(0);
  const router = useRouter();

  const loadAchievements = useCallback(async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(
        `/api/achievements?user_email=${encodeURIComponent(user.email)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setAchievements(data.achievements || []);
        setTotalPoints(
          data.achievements?.reduce(
            (sum: number, ach: any) => sum + (ach.points || 0),
            0,
          ) || 0,
        );
      }
    } catch (e) {
      console.error("Failed to load achievements:", e);
    }
  }, [user?.email]);

  useEffect(() => {
    if (session?.user?.email) {
      setUser(session.user);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (user?.email) {
      loadAchievements();
    }
  }, [user, loadAchievements]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  const unlockedAchievements = achievements;
  const unlockedNames = new Set(achievements.map((ach) => ach.badge_name));
  const lockedAchievements = allPossibleAchievements.filter(
    (ach) => !unlockedNames.has(ach.name),
  );

  const filteredUnlocked =
    selectedCategory === "all"
      ? unlockedAchievements
      : unlockedAchievements.filter(
          (ach) => ach.badge_type === selectedCategory,
        );

  const filteredLocked =
    selectedCategory === "all"
      ? lockedAchievements
      : lockedAchievements.filter((ach) => ach.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-10 h-10 text-yellow-500 text-3xl inline-flex items-center justify-center">🏆</span>
            <h1 className="text-4xl font-bold text-gray-900">
              Achievements
            </h1>
          </div>
          <div className="flex justify-center items-center gap-6">
            <div className="bg-white rounded-xl px-6 py-3 soft-glow">
              <div className="text-2xl font-bold text-blue-600">
                {unlockedAchievements.length}
              </div>
              <div className="text-sm text-gray-600">Unlocked</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-3 soft-glow">
              <div className="text-2xl font-bold text-yellow-600">
                {totalPoints}
              </div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-3 soft-glow">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(
                  (unlockedAchievements.length /
                    allPossibleAchievements.length) *
                    100,
                )}
                %
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-2 soft-glow">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All
              </button>
              {achievementCategories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    selectedCategory === cat.category
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Unlocked Achievements */}
        {filteredUnlocked.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              ✨ Unlocked ({filteredUnlocked.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUnlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200 soft-glow"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{achievement.badge_emoji}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {achievement.badge_name}
                      </h3>
                      <p className="text-gray-700 text-sm mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-700 font-semibold">
                          +{achievement.points} points
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(
                            achievement.unlocked_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {filteredLocked.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-gray-400" />
              Available ({filteredLocked.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLocked.map((achievement, idx) => (
                <div
                  key={idx}
                  className="bg-gray-100 rounded-xl p-6 border-2 border-gray-200 opacity-75"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl grayscale">
                      {achievement.emoji}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-700 text-lg mb-1">
                        {achievement.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-semibold">
                          +{achievement.points} points
                        </span>
                        <span className="text-xs text-gray-400">🔒 Locked</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredUnlocked.length === 0 && filteredLocked.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎆</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Start Your Achievement Journey!
            </h3>
            <p className="text-gray-600">
              Complete goals, share posts, and engage with the community to
              unlock achievements.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
