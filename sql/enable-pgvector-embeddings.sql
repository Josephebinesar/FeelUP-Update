-- ============================================================
-- SQL Migration: Enable pgvector + embedding column for PeerMatch
-- Run this in your Supabase SQL Editor BEFORE running backfill
-- ============================================================

-- ── 1. Enable the pgvector extension ──────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. Add embedding column to mood_posts ─────────────────
ALTER TABLE public.mood_posts
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- ── 3. Create IVFFLAT index for similarity search ─────────
-- Note: Create AFTER backfill, not before (empty index is fine too)
CREATE INDEX IF NOT EXISTS mood_posts_embedding_idx
  ON public.mood_posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── 4. match_peers stored function (used by /api/match-peers) ─
CREATE OR REPLACE FUNCTION match_peers(
  query_embedding vector(384),
  match_user_id   uuid,
  match_threshold float DEFAULT 0.6,
  match_count     int   DEFAULT 10
)
RETURNS TABLE (
  post_id     uuid,
  owner_id    uuid,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id          AS post_id,
    owner_id,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.mood_posts
  WHERE
    owner_id   != match_user_id
    AND visibility = 'public'
    AND embedding IS NOT NULL
    AND (1 - (embedding <=> query_embedding)) >= match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

SELECT 'pgvector + embeddings migration done ✅' AS result;
