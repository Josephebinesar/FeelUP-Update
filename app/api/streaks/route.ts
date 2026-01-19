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
      .from("user_streaks")
      .select("*")
      .eq("user_email", userEmail);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Normalize returned rows to predictable fields
    const normalized = (data || []).map((row: any) => ({
      id: row.id,
      user_email: row.user_email,
      streak_type: row.streak_type,
      current_count: Number(row.current_count || row.current_count === 0 ? row.current_count : row.currentCount || 0),
      best_count: Number(row.best_count || row.best_count === 0 ? row.best_count : row.bestCount || 0),
      last_activity_date: row.last_activity_date ? (new Date(row.last_activity_date)).toISOString().split("T")[0] : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ streaks: normalized });
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
    const { user_email, streak_type, activity_date } = body || {};

    if (!user_email || !streak_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const today = activity_date || new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get current streak data
    const { data: currentStreak } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_email", user_email)
      .eq("streak_type", streak_type)
      .single();

    let newCount = 1;
    let bestCount = 1;

    if (currentStreak) {
      const lastActivityRaw = currentStreak.last_activity_date;
      const lastActivity = lastActivityRaw ? new Date(lastActivityRaw).toISOString().split("T")[0] : null;

      if (lastActivity === today) {
        // Already recorded today, no change
        const normalized = {
          ...currentStreak,
          current_count: Number(currentStreak.current_count || currentStreak.currentCount || 0),
          best_count: Number(currentStreak.best_count || currentStreak.bestCount || 0),
          last_activity_date: lastActivity,
        };
        return NextResponse.json({ streak: normalized });
      } else if (lastActivity === yesterday) {
        // Continuing streak
        newCount = (currentStreak.current_count || currentStreak.currentCount || 0) + 1;
        bestCount = Math.max(currentStreak.best_count || currentStreak.bestCount || 0, newCount);
      } else {
        // Streak broken, reset to 1
        newCount = 1;
        bestCount = currentStreak.best_count || currentStreak.bestCount || 0;
      }
    }

    // Update or insert streak
    const { data: streak, error } = await supabase
      .from("user_streaks")
      .upsert({
        user_email,
        streak_type,
        current_count: newCount,
        best_count: bestCount,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Check for achievements
    await checkStreakAchievements(supabase, user_email, streak_type, newCount);

    return NextResponse.json({ streak });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { user_email, streak_type, action, activity_date } = body || {};

    if (!user_email || !streak_type || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const today = activity_date || new Date().toISOString().split("T")[0];

    // Fetch current streak
    const { data: currentStreak, error: fetchErr } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_email", user_email)
      .eq("streak_type", streak_type)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!currentStreak) {
      return NextResponse.json({ error: "Streak not found" }, { status: 404 });
    }

    if (action === "decrement") {
      // Only decrement if the last activity was recorded for the provided date
      const lastActivityRaw = currentStreak.last_activity_date;
      const lastActivity = lastActivityRaw ? new Date(lastActivityRaw).toISOString().split("T")[0] : null;
      if (!lastActivity || lastActivity !== today) {
        const normalized = {
          ...currentStreak,
          current_count: Number(currentStreak.current_count || currentStreak.currentCount || 0),
          best_count: Number(currentStreak.best_count || currentStreak.bestCount || 0),
          last_activity_date: lastActivity,
        };
        return NextResponse.json({ streak: normalized });
      }

      const newCount = Math.max(0, (currentStreak.current_count || currentStreak.currentCount || 0) - 1);

      // If we still have a streak, set last_activity_date to yesterday, otherwise null
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const updatedLast = newCount > 0 ? yesterday : null;

      const { data: updated, error: updateErr } = await supabase
        .from("user_streaks")
        .update({
          current_count: newCount,
          last_activity_date: updatedLast,
          updated_at: new Date().toISOString(),
        })
        .eq("user_email", user_email)
        .eq("streak_type", streak_type)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      const normalizedUpdated = {
        ...updated,
        current_count: Number(updated.current_count || updated.currentCount || 0),
        best_count: Number(updated.best_count || updated.bestCount || 0),
        last_activity_date: updated.last_activity_date ? new Date(updated.last_activity_date).toISOString().split("T")[0] : null,
      };

      return NextResponse.json({ streak: normalizedUpdated });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

async function checkStreakAchievements(
  supabase: any,
  userEmail: string,
  streakType: string,
  count: number,
) {
  const milestones = [
    { days: 3, name: "Getting Started", emoji: "🌱" },
    { days: 7, name: "Week Warrior", emoji: "⚡" },
    { days: 14, name: "Two Week Tiger", emoji: "🐅" },
    { days: 30, name: "Month Master", emoji: "🏆" },
    { days: 50, name: "Consistency Champion", emoji: "🏅" },
    { days: 100, name: "Century Superstar", emoji: "⭐" },
  ];

  for (const milestone of milestones) {
    if (count === milestone.days) {
      await supabase.from("achievements").upsert({
        user_email: userEmail,
        badge_type: "streak",
        badge_name: milestone.name,
        badge_emoji: milestone.emoji,
        description: `Maintained a ${milestone.days}-day ${streakType} streak!`,
        requirement_value: milestone.days,
        points: milestone.days * 10,
      });
    }
  }
}
