-- ⚠️ COPY THIS ENTIRE SCRIPT AND RUN IT IN SUPABASE SQL EDITOR
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query

-- 1. Add missing columns to mood_posts
ALTER TABLE public.mood_posts 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS mood TEXT,
ADD COLUMN IF NOT EXISTS mood_color TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Add missing username column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_mood_posts_owner_id ON public.mood_posts(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 4. Update RLS policies
DROP POLICY IF EXISTS "Allow all operations on mood_posts" ON public.mood_posts;
CREATE POLICY "Allow all operations on mood_posts" ON public.mood_posts FOR ALL USING (true);

-- 5. Verify columns were added (you should see owner_id, mood, mood_color, image_url)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'mood_posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;
