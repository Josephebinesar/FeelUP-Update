import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userEmail = url.searchParams.get("user_email");

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing user_email" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_email", userEmail)
      .order("unlocked_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Calculate total points
    const totalPoints =
      data?.reduce((sum, achievement) => sum + (achievement.points || 0), 0) ||
      0;

    return NextResponse.json({
      achievements: data,
      totalPoints,
      count: data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_email, badge_type, trigger_data } = body || {};

    if (!user_email || !badge_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const newAchievements: any[] = [];

    // Check different achievement types
    if (badge_type === "goals") {
      const achievements = await checkGoalAchievements(
        supabase,
        user_email,
        trigger_data,
      );
      newAchievements.push(...achievements);
    } else if (badge_type === "social") {
      const achievements = await checkSocialAchievements(
        supabase,
        user_email,
        trigger_data,
      );
      newAchievements.push(...achievements);
    } else if (badge_type === "wellness") {
      const achievements = await checkWellnessAchievements(
        supabase,
        user_email,
        trigger_data,
      );
      newAchievements.push(...achievements);
    }

    return NextResponse.json({ newAchievements });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

async function checkGoalAchievements(
  supabase: any,
  userEmail: string,
  data: any,
) {
  const { totalCompleted, completedToday } = data;
  const achievements: any[] = [];

  const goalMilestones = [
    {
      count: 1,
      name: "First Steps",
      emoji: "👟",
      description: "Completed your first goal!",
    },
    {
      count: 5,
      name: "Goal Getter",
      emoji: "🎯",
      description: "Completed 5 goals",
    },
    {
      count: 10,
      name: "Achievement Unlocked",
      emoji: "🏅",
      description: "Completed 10 goals",
    },
    {
      count: 25,
      name: "Goal Crushing Machine",
      emoji: "💪",
      description: "Completed 25 goals",
    },
    {
      count: 50,
      name: "Half Century Hero",
      emoji: "🌟",
      description: "Completed 50 goals",
    },
    {
      count: 100,
      name: "Centurion Champion",
      emoji: "👑",
      description: "Completed 100 goals",
    },
  ];

  for (const milestone of goalMilestones) {
    if (totalCompleted === milestone.count) {
      const { data: newAchievement } = await supabase
        .from("achievements")
        .upsert({
          user_email: userEmail,
          badge_type: "goals",
          badge_name: milestone.name,
          badge_emoji: milestone.emoji,
          description: milestone.description,
          requirement_value: milestone.count,
          points: milestone.count * 5,
        })
        .select()
        .single();

      if (newAchievement) achievements.push(newAchievement);
    }
  }

  // Daily completion achievements
  if (completedToday >= 3) {
    await supabase.from("achievements").upsert({
      user_email: userEmail,
      badge_type: "goals",
      badge_name: "Daily Achiever",
      badge_emoji: "⭐",
      description: "Completed 3 goals in one day",
      requirement_value: 3,
      points: 25,
    });
  }

  return achievements;
}

async function checkSocialAchievements(
  supabase: any,
  userEmail: string,
  data: any,
) {
  const { postsCount, reactionsGiven } = data;
  const achievements: any[] = [];

  const socialMilestones = [
    {
      count: 1,
      name: "First Share",
      emoji: "💭",
      description: "Shared your first mood post",
    },
    {
      count: 5,
      name: "Social Butterfly",
      emoji: "🦋",
      description: "Shared 5 mood posts",
    },
    {
      count: 10,
      name: "Community Member",
      emoji: "🤝",
      description: "Active community participant",
    },
    {
      count: 25,
      name: "Positivity Spreader",
      emoji: "✨",
      description: "Spreading positivity everywhere",
    },
  ];

  for (const milestone of socialMilestones) {
    if (postsCount === milestone.count) {
      const { data: newAchievement } = await supabase
        .from("achievements")
        .upsert({
          user_email: userEmail,
          badge_type: "social",
          badge_name: milestone.name,
          badge_emoji: milestone.emoji,
          description: milestone.description,
          requirement_value: milestone.count,
          points: milestone.count * 3,
        })
        .select()
        .single();

      if (newAchievement) achievements.push(newAchievement);
    }
  }

  return achievements;
}

async function checkWellnessAchievements(
  supabase: any,
  userEmail: string,
  data: any,
) {
  const { journalEntries, gratitudeNotes } = data;
  const achievements: any[] = [];

  if (journalEntries >= 7) {
    await supabase.from("achievements").upsert({
      user_email: userEmail,
      badge_type: "wellness",
      badge_name: "Mindful Writer",
      badge_emoji: "📝",
      description: "Created 7 journal entries",
      requirement_value: 7,
      points: 30,
    });
  }

  return achievements;
}
