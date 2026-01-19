import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server only
);

/**
 * GET /api/users
 * Optional params:
 * - id
 * - username
 * - search
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const username = searchParams.get("username");
    const search = searchParams.get("search");

    let query = supabase.from("profiles").select("*");

    // Get by ID
    if (id) {
      const { data, error } = await query.eq("id", id).single();
      if (error || !data) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    // Get by username
    if (username) {
      const { data, error } = await query
        .eq("username", username.toLowerCase())
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    // Search users
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users
 * Update logged-in user's profile
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, full_name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
