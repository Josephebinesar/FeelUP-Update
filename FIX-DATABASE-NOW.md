# 🚨 URGENT: Fix Database Schema

## The Problem
The `mood_posts` table in your Supabase database is missing required columns:
- `owner_id`
- `mood`
- `mood_color`
- `image_url`

## The Solution

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Log in to your account
3. Select your **FeelUp** project
4. Click **SQL Editor** in the left sidebar
5. Click **New Query**

### Step 2: Run the Migration Script
Copy and paste this ENTIRE script into the SQL Editor:

```sql
-- Add missing columns to mood_posts
ALTER TABLE public.mood_posts 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS mood TEXT,
ADD COLUMN IF NOT EXISTS mood_color TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add missing username column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mood_posts_owner_id ON public.mood_posts(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update RLS policies
DROP POLICY IF EXISTS "Allow all operations on mood_posts" ON public.mood_posts;
CREATE POLICY "Allow all operations on mood_posts" ON public.mood_posts FOR ALL USING (true);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'mood_posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Step 3: Click "RUN" button

### Step 4: Verify Success
You should see a table showing all columns including:
- `id`
- `content`
- `mood_emoji`
- `visibility`
- `anonymous`
- `created_at`
- **`owner_id`** ← NEW
- **`mood`** ← NEW
- **`mood_color`** ← NEW
- **`image_url`** ← NEW

### Step 5: Test the Mood Feed
1. Go back to your app: http://localhost:3000/mood-feed
2. Open browser console (F12)
3. Try creating a post
4. You should now see detailed error messages if anything fails

## What I've Also Fixed
✅ Better error logging - you'll now see the actual error message
✅ Content is optional - you can post just an image or just text
✅ Validation alerts - tells you what's missing before submitting

## After Running the SQL
The errors should disappear and you'll be able to:
- Create mood posts ✅
- See posts in the feed ✅
- Upload images ✅
- Real-time updates ✅
