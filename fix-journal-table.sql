-- Fix journal_entries table - Add missing columns
-- Copy and paste this into your Supabase SQL Editor

-- Add the missing columns if they don't exist
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS can_convert_to_post BOOLEAN DEFAULT false;

ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update any existing records to have the new column
UPDATE public.journal_entries 
SET can_convert_to_post = false, updated_at = now()
WHERE can_convert_to_post IS NULL OR updated_at IS NULL;

-- Also ensure we have the correct column name for mood (API uses mood_tag)
-- Check if mood column exists and rename to mood_tag if needed
DO $$ 
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'journal_entries' AND column_name = 'mood') THEN
        ALTER TABLE public.journal_entries RENAME COLUMN mood TO mood_tag;
    END IF;
END $$;

-- Create updated index
DROP INDEX IF EXISTS idx_journal_entries_user_email;
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_email 
ON public.journal_entries(user_email, created_at DESC);

SELECT 'journal_entries table updated successfully!' as result;