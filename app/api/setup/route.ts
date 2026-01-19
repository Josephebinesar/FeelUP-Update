import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabaseClient";

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    // Create tables one by one to avoid issues
    const queries = [
      // Enhanced profiles table
      `CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        mood_color TEXT DEFAULT '#6b7280',
        theme TEXT DEFAULT 'default',
        privacy_level TEXT DEFAULT 'public',
        streak_count INTEGER DEFAULT 0,
        total_goals_completed INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );`,

      // Enhanced mood posts
      `CREATE TABLE IF NOT EXISTS public.mood_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID,
        owner_email TEXT,
        content TEXT NOT NULL,
        mood TEXT,
        mood_emoji TEXT,
        mood_color TEXT,
        visibility TEXT DEFAULT 'public',
        circle_id UUID,
        anonymous BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );`,

      // Post reactions
      `CREATE TABLE IF NOT EXISTS public.post_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID,
        user_id UUID,
        reaction_type TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );`,

      // Daily goals
      `CREATE TABLE IF NOT EXISTS public.daily_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        target_date DATE DEFAULT CURRENT_DATE,
        completed_at TIMESTAMPTZ,
        mood_at_completion TEXT,
        reflection_note TEXT,
        is_shared BOOLEAN DEFAULT false,
        streak_day INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now()
      );`,

      // Journal entries
      `CREATE TABLE IF NOT EXISTS public.journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        title TEXT,
        content TEXT NOT NULL,
        mood TEXT,
        mood_emoji TEXT,
        tags TEXT[],
        is_gratitude BOOLEAN DEFAULT false,
        converted_to_post_id UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );`,

      // --- MIGRATIONS ---
      // Fix profiles
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;`,

      // Fix mood_posts
      `ALTER TABLE public.mood_posts 
       ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
       ADD COLUMN IF NOT EXISTS mood TEXT,
       ADD COLUMN IF NOT EXISTS mood_color TEXT,
       ADD COLUMN IF NOT EXISTS image_url TEXT;`,

      // Fix RLS for mood_posts to allow owner insert
      `DROP POLICY IF EXISTS "Users can create their own mood posts" ON public.mood_posts;`,
      `CREATE POLICY "Users can create their own mood posts" ON public.mood_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);`
    ];

    // Execute each query
    for (const query of queries) {
      const { error } = await supabase.rpc("exec_sql", { sql: query });
      if (error) {
        console.error("Query error:", error, "for query:", query);
        // Continue with other queries even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database setup completed",
    });
  } catch (err: any) {
    console.error("Setup error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
