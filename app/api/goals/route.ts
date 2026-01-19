import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_email = url.searchParams.get("user_email");
    const date =
      url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!user_email) {
      return NextResponse.json(
        { error: "User email required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: goals, error } = await supabase
      .from("daily_goals")
      .select("*")
      .eq("user_id", profile.id)
      .eq("target_date", date)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 },
      );
    }

    return NextResponse.json({ goals: goals || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { user_email, title, description, category, target_date } =
      await req.json();

    if (!user_email || !title?.trim()) {
      return NextResponse.json(
        { error: "User email and title are required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, streak_count")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: newGoal, error } = await supabase
      .from("daily_goals")
      .insert({
        user_id: profile.id,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || "personal",
        target_date: target_date || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create goal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ goal: newGoal });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const {
      goal_id,
      user_email,
      completed,
      mood_at_completion,
      reflection_note,
      title,
      description,
      category,
    } = await req.json();

    if (!goal_id || !user_email) {
      return NextResponse.json(
        { error: "Goal ID and user email required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, total_goals_completed, streak_count")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update goal data
    const updateData: any = {};

    // Handle completion status
    if (completed !== undefined) {
      if (completed) {
        updateData.completed_at = new Date().toISOString();
        updateData.mood_at_completion = mood_at_completion;
        updateData.reflection_note = reflection_note;

        // Update user's total goals completed
        await supabase
          .from("profiles")
          .update({
            total_goals_completed: (profile.total_goals_completed || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        // Check for streak achievements
        const today = new Date().toISOString().split("T")[0];
        const { data: todayGoals } = await supabase
          .from("daily_goals")
          .select("completed_at")
          .eq("user_id", profile.id)
          .eq("target_date", today)
          .not("completed_at", "is", null);

        if (todayGoals && todayGoals.length >= 3) {
          // Award achievement for completing 3 goals in a day
          try {
            await supabase.from("achievements").upsert({
              user_id: profile.id,
              badge_type: "daily_achiever",
              badge_name: "Daily Achiever",
              description: "Completed 3 goals in a single day",
            });
          } catch (e) {
            // Ignore achievement errors
          }
        }
      } else {
        updateData.completed_at = null;
        updateData.mood_at_completion = null;
        updateData.reflection_note = null;
      }
    }

    // Handle editing title, description, category (only if goal is not completed)
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category;

    const { data: updatedGoal, error } = await supabase
      .from("daily_goals")
      .update(updateData)
      .eq("id", goal_id)
      .eq("user_id", profile.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update goal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ goal: updatedGoal });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const goal_id = url.searchParams.get("goal_id");
    const user_email = url.searchParams.get("user_email");

    if (!goal_id || !user_email) {
      return NextResponse.json(
        { error: "Goal ID and user email required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete the goal owned by the user
    const { error } = await supabase
      .from("daily_goals")
      .delete()
      .eq("id", goal_id)
      .eq("user_id", profile.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
