-- FeelUp Database Setup Script
-- Copy and paste this entire script into your Supabase SQL Editor
-- Create profiles table

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  mood_color TEXT DEFAULT '#6b7280',
  theme TEXT DEFAULT 'default',
  privacy_level TEXT DEFAULT 'public',
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_goals_completed INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_type TEXT DEFAULT 'goals', -- goals, posts, journal
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Create user_streaks table for detailed tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  streak_type TEXT NOT NULL, -- goals, posts, journal, overall
  current_count INTEGER DEFAULT 0,
  best_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, streak_type)
);
-- Create achievements table for badges and milestones
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  badge_type TEXT NOT NULL, -- streak, goals, social, wellness
  badge_name TEXT NOT NULL,
  badge_emoji TEXT,
  description TEXT,
  requirement_value INTEGER, -- e.g., 7 for "7-day streak"
  points INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, badge_type, badge_name)
);
-- Create mood_posts table (matches your API)
-- Create mood_posts table (matches your API)
CREATE TABLE IF NOT EXISTS public.mood_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT, -- kept for legacy/backup
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT,
  mood_emoji TEXT,
  mood_color TEXT,
  image_url TEXT,
  visibility TEXT DEFAULT 'public',
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Create post_reactions table (matches your API)
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.mood_posts(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_email, type)
);
-- Create post_comments table for supportive comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.mood_posts(id) ON DELETE CASCADE,
  user_email TEXT,
  content TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Create goals table (matches your API)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  mood_at_completion TEXT,
  reflection_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Create journal_entries table (matches your API)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  mood_tag TEXT,
  mood_emoji TEXT,
  gratitude_notes TEXT[],
  tags TEXT[],
  is_private BOOLEAN DEFAULT true,
  is_gratitude BOOLEAN DEFAULT false,
  can_convert_to_post BOOLEAN DEFAULT false,
  energy_level INTEGER, -- 1-5 scale
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
-- Create policies for public access
CREATE POLICY "Allow all operations on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on mood_posts" ON public.mood_posts FOR ALL USING (true);
CREATE POLICY "Allow all operations on post_reactions" ON public.post_reactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on post_comments" ON public.post_comments FOR ALL USING (true);
CREATE POLICY "Allow all operations on goals" ON public.goals FOR ALL USING (true);
CREATE POLICY "Allow all operations on journal_entries" ON public.journal_entries FOR ALL USING (true);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mood_posts_user_email ON public.mood_posts(user_email);
CREATE INDEX IF NOT EXISTS idx_mood_posts_created ON public.mood_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_email ON public.goals(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_email ON public.journal_entries(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
-- Success message
SELECT 'FeelUp database setup completed successfully!' as result;