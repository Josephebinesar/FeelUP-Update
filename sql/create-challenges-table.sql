-- ============================================================
-- SQL Migration: challenges + challenge_participants tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── 1. challenges ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL CHECK (char_length(title) > 0),
  description  text,
  starts_on    date,
  ends_on      date,
  visibility   text NOT NULL DEFAULT 'public'
               CHECK (visibility IN ('public', 'followers', 'circle')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can read public challenges
CREATE POLICY "challenges_select_public"
  ON public.challenges FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid());

-- Only owner can insert
CREATE POLICY "challenges_insert_own"
  ON public.challenges FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owner can update
CREATE POLICY "challenges_update_own"
  ON public.challenges FOR UPDATE
  USING (owner_id = auth.uid());

-- Only owner can delete
CREATE POLICY "challenges_delete_own"
  ON public.challenges FOR DELETE
  USING (owner_id = auth.uid());

-- ── 2. challenge_participants ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Users can see participants of public challenges
CREATE POLICY "challenge_participants_select"
  ON public.challenge_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND (c.visibility = 'public' OR c.owner_id = auth.uid())
    )
  );

-- Users can join challenges
CREATE POLICY "challenge_participants_insert"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can leave challenges
CREATE POLICY "challenge_participants_delete"
  ON public.challenge_participants FOR DELETE
  USING (user_id = auth.uid());

-- ── 3. Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS challenges_owner_idx ON public.challenges(owner_id);
CREATE INDEX IF NOT EXISTS challenges_visibility_idx ON public.challenges(visibility);
CREATE INDEX IF NOT EXISTS challenges_starts_on_idx ON public.challenges(starts_on);
CREATE INDEX IF NOT EXISTS challenge_participants_challenge_idx ON public.challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS challenge_participants_user_idx ON public.challenge_participants(user_id);

-- ── 4. Enable realtime ─────────────────────────────────────
-- Run in Supabase Dashboard > Database > Replication
-- or:
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;

SELECT 'challenges migration done ✅' AS result;
