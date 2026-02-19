import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";

/**
 * GET /api/streaks?user_id=<uuid>
 * Returns all streak rows for the user, normalized.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      streak_type: row.streak_type,
      current_count: Number(
        row.current_count ?? row.currentCount ?? 0
      ),
      best_count: Number(
        row.best_count ?? row.bestCount ?? 0
      ),
      last_activity_date: row.last_activity_date
        ? new Date(row.last_activity_date).toISOString().split("T")[0]
        : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ streaks: normalized });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streaks
 * Body: { user_id, streak_type, activity_date? }
 * Records activity (increments streak if yesterday, no-op if already today).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, streak_type, activity_date } = body || {};

    if (!user_id || !streak_type) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, streak_type" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const today = activity_date || new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get current streak row (single by unique key)
    const { data: currentStreak, error: fetchErr } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user_id)
      .eq("streak_type", streak_type)
      .single();

    // If it doesn't exist, Supabase sometimes returns an error for .single()
    // We only treat it as fatal if it is NOT a "no rows" case.
    if (fetchErr && !String(fetchErr.message || "").toLowerCase().includes("0 rows")) {
      // Some clients have different messages; you can also log fetchErr here.
      // We'll still proceed assuming no row.
    }

    let newCount = 1;
    let bestCount = 1;

    if (currentStreak) {
      const lastActivityRaw = currentStreak.last_activity_date;
      const lastActivity = lastActivityRaw
        ? new Date(lastActivityRaw).toISOString().split("T")[0]
        : null;

      const currentCount = Number(currentStreak.current_count ?? currentStreak.currentCount ?? 0);
      const currentBest = Number(currentStreak.best_count ?? currentStreak.bestCount ?? 0);

      if (lastActivity === today) {
        // Already recorded today, no change
        return NextResponse.json({
          streak: {
            ...currentStreak,
            current_count: currentCount,
            best_count: currentBest,
            last_activity_date: lastActivity,
          },
        });
      } else if (lastActivity === yesterday) {
        // Continuing streak
        newCount = currentCount + 1;
        bestCount = Math.max(currentBest, newCount);
      } else {
        // Streak broken
        newCount = 1;
        bestCount = currentBest;
      }
    }

    // Upsert by (user_id, streak_type) UNIQUE constraint you added
    const { data: streak, error } = await supabase
      .from("user_streaks")
      .upsert(
        {
          user_id,
          streak_type,
          current_count: newCount,
          best_count: bestCount,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,streak_type" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Achievements (optional)
    await checkStreakAchievements(supabase, user_id, streak_type, newCount);

    return NextResponse.json({ streak });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/streaks
 * Body: { user_id, streak_type, action: "decrement", activity_date? }
 * Used when a completed action is undone.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { user_id, streak_type, action, activity_date } = body || {};

    if (!user_id || !streak_type || !action) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, streak_type, action" },
        { status: 400 }
      );
    }

    if (action !== "decrement") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const today = activity_date || new Date().toISOString().split("T")[0];

    // Fetch current streak
    const { data: currentStreak, error: fetchErr } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user_id)
      .eq("streak_type", streak_type)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!currentStreak) {
      return NextResponse.json({ error: "Streak not found" }, { status: 404 });
    }

    const lastActivityRaw = currentStreak.last_activity_date;
    const lastActivity = lastActivityRaw
      ? new Date(lastActivityRaw).toISOString().split("T")[0]
      : null;

    const currentCount = Number(currentStreak.current_count ?? currentStreak.currentCount ?? 0);

    // Only decrement if the last activity was recorded for today
    if (!lastActivity || lastActivity !== today) {
      return NextResponse.json({
        streak: {
          ...currentStreak,
          current_count: currentCount,
          best_count: Number(currentStreak.best_count ?? currentStreak.bestCount ?? 0),
          last_activity_date: lastActivity,
        },
      });
    }

    const newCount = Math.max(0, currentCount - 1);

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
      .eq("user_id", user_id)
      .eq("streak_type", streak_type)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      streak: {
        ...updated,
        current_count: Number(updated.current_count ?? updated.currentCount ?? 0),
        best_count: Number(updated.best_count ?? updated.bestCount ?? 0),
        last_activity_date: updated.last_activity_date
          ? new Date(updated.last_activity_date).toISOString().split("T")[0]
          : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* -------------------- ACHIEVEMENTS -------------------- */

async function checkStreakAchievements(
  supabase: any,
  userId: string,
  streakType: string,
  count: number
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
        user_id: userId,
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
