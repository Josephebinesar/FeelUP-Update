-- Fix Database Schema for Mood Feed
-- Run this script in your Supabase SQL Editor

-- 1. Update profiles table (Missing username column)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Update mood_posts table (Missing columns for feed)
ALTER TABLE public.mood_posts 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS mood TEXT,
ADD COLUMN IF NOT EXISTS mood_color TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_posts_owner_id ON public.mood_posts(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 4. RLS Policy: Allow users to create their own posts
-- Note: 'auth.uid()' refers to the currently logged in user in Supabase
CREATE POLICY "Users can create their own mood posts" 
ON public.mood_posts 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- 5. Enable RLS on mood_posts if not already enabled (it should be)
ALTER TABLE public.mood_posts ENABLE ROW LEVEL SECURITY;
