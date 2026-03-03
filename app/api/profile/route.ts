import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json(
            { error: "Email parameter is required" },
            { status: 400 }
        );
    }

    const supabase = createServerSupabaseClient();

    // Query the profile by email
    // Note: Using service role key bypasses RLS, so this endpoint returns data for any email provided.
    // In a real production scenario, consistent RLS or checking the auth session is recommended.
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
}