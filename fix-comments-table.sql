-- Create post_comments table for supportive comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.mood_posts(id) ON DELETE CASCADE,
  user_email TEXT,
  content TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all operations on post_comments" ON public.post_comments FOR ALL USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

-- Add foreign key constraint if not exists
ALTER TABLE public.post_comments 
ADD CONSTRAINT post_comments_user_email_fkey 
FOREIGN KEY (user_email) 
REFERENCES public.profiles(email) 
ON DELETE SET NULL;