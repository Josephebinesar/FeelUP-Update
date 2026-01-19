-- FeelUp Database Schema
-- Complete schema for all FeelUp features

-- Enhanced profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  mood_color TEXT DEFAULT '#6b7280',
  theme TEXT DEFAULT 'default',
  privacy_level TEXT DEFAULT 'public', -- public, friends, private
  streak_count INTEGER DEFAULT 0,
  total_goals_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Friend relationships
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Friend circles/groups
CREATE TABLE IF NOT EXISTS public.friend_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Circle memberships
CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES public.friend_circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

-- Enhanced mood posts with reactions and visibility
CREATE TABLE IF NOT EXISTS public.mood_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_email TEXT,
  content TEXT NOT NULL,
  mood TEXT,
  mood_emoji TEXT,
  mood_color TEXT,
  visibility TEXT DEFAULT 'public', -- public, friends, circle, anonymous
  circle_id UUID REFERENCES public.friend_circles(id),
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Post reactions (positive only)
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.mood_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- cheer, support, hug, care
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Comments on posts
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.mood_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily goals system
CREATE TABLE IF NOT EXISTS public.daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- study, exercise, wellness, social, creative
  target_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  mood_at_completion TEXT,
  reflection_note TEXT,
  is_shared BOOLEAN DEFAULT false,
  streak_day INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Personal journal entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  mood TEXT,
  mood_emoji TEXT,
  tags TEXT[], -- array of tags like ['grateful', 'anxious', 'hopeful']
  is_gratitude BOOLEAN DEFAULT false,
  converted_to_post_id UUID REFERENCES public.mood_posts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Achievements and badges
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- streak_7, goals_10, support_giver, etc
  badge_name TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT now()
);

-- Events and activities
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT, -- wellness, study, meetup, challenge
  location TEXT,
  is_virtual BOOLEAN DEFAULT false,
  max_participants INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event participants
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'joined', -- joined, maybe, declined
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Mood tracking for analytics
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  mood_emoji TEXT,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- Daily affirmations
CREATE TABLE IF NOT EXISTS public.affirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category TEXT, -- motivation, calm, confidence, growth
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User's received affirmations
CREATE TABLE IF NOT EXISTS public.user_affirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  affirmation_id UUID REFERENCES public.affirmations(id),
  shown_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_mood_posts_owner ON public.mood_posts(owner_id);
CREATE INDEX IF NOT EXISTS idx_mood_posts_created ON public.mood_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_posts_visibility ON public.mood_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON public.daily_goals(user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON public.journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON public.mood_entries(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);

-- Sample affirmations data
INSERT INTO public.affirmations (content, category) VALUES
('You are capable of amazing things', 'motivation'),
('Your feelings are valid and important', 'calm'),
('Progress, not perfection, is what matters', 'growth'),
('You deserve kindness, especially from yourself', 'confidence'),
('Every small step forward counts', 'motivation'),
('It''s okay to take things one day at a time', 'calm'),
('You have overcome challenges before', 'confidence'),
('Your mental health matters', 'wellness'),
('You are worthy of love and support', 'confidence'),
('Growth happens outside your comfort zone', 'growth')
ON CONFLICT DO NOTHING;
