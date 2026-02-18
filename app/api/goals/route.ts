import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";

/* ====================== GET ====================== */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_email = url.searchParams.get("user_email");

    if (!user_email) {
      return NextResponse.json(
        { error: "User email required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { data: goals, error } = await supabase
      .from("goals") // ✅ correct table
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ goals: goals || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* ====================== POST ====================== */
export async function POST(req: Request) {
  try {
    const { user_email, title } = await req.json();

    if (!user_email || !title?.trim()) {
      return NextResponse.json(
        { error: "User email and title required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        user_id: profile.id,
        title: title.trim(),
        completed: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* ====================== PATCH ====================== */
export async function PATCH(req: Request) {
  try {
    const {
      goal_id,
      user_email,
      completed,
      mood_at_completion,
      reflection_note,
    } = await req.json();

    if (!goal_id || !user_email) {
      return NextResponse.json(
        { error: "Goal ID and user email required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (completed !== undefined) {
      if (completed) {
        updateData.completed = true;
        updateData.completed_at = new Date().toISOString();
        updateData.mood_at_completion = mood_at_completion ?? null;
        updateData.reflection_note = reflection_note ?? null;
      } else {
        updateData.completed = false;
        updateData.completed_at = null;
        updateData.mood_at_completion = null;
        updateData.reflection_note = null;
      }
    }

    const { data: updatedGoal, error } = await supabase
      .from("goals")
      .update(updateData)
      .eq("id", goal_id)
      .eq("user_id", profile.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal: updatedGoal });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* ====================== DELETE ====================== */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const goal_id = url.searchParams.get("goal_id");
    const user_email = url.searchParams.get("user_email");

    if (!goal_id || !user_email) {
      return NextResponse.json(
        { error: "Goal ID and user email required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user_email)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goal_id)
      .eq("user_id", profile.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
