-- Create journal_entries table if it doesn't exist
-- Copy and paste this into your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  mood_tag TEXT,
  mood_emoji TEXT,
  energy_level INTEGER, -- 1-5 scale
  tags TEXT[],
  is_gratitude BOOLEAN DEFAULT false,
  can_convert_to_post BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (you may want to restrict this later)
CREATE POLICY "Allow all operations on journal_entries" 
ON public.journal_entries FOR ALL USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_email 
ON public.journal_entries(user_email, created_at DESC);

-- Check if table was created successfully
SELECT 'journal_entries table created successfully!' as result;