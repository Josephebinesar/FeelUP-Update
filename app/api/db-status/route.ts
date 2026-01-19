import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Check if tables exist
    const tables = [
      "profiles",
      "mood_posts",
      "post_reactions",
      "daily_goals",
      "journal_entries",
    ];
    const results: any = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("count", { count: "exact", head: true });

        results[table] = error
          ? `Error: ${error.message}`
          : `✅ Exists (${data?.length || 0} rows)`;
      } catch (e) {
        results[table] = `❌ Missing or error`;
      }
    }

    return NextResponse.json({
      status: "Database Status Check",
      tables: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || String(err),
        message: "Failed to check database status",
      },
      { status: 500 },
    );
  }
}
