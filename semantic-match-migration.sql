-- ============================================================
-- FeelUp: Semantic Peer-to-Peer Support Matching Migration
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension (built-in to Supabase, no extra cost)
create extension if not exists vector;

-- 2. Add embedding column to mood_posts (768-dim for bge-base-en-v1.5)
alter table mood_posts
  add column if not exists embedding vector(768);

-- 3. Create HNSW index for fast approximate nearest-neighbour search
--    (much faster than brute-force for large datasets)
create index if not exists mood_posts_embedding_hnsw_idx
  on mood_posts
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Core semantic match function using cosine distance (<=>)
--    Returns posts semantically similar to a query embedding vector.
create or replace function match_mood_posts(
  query_embedding  vector(768),
  match_threshold  float   default 0.65,
  match_count      int     default 5,
  exclude_owner    uuid    default null
)
returns table (
  id           uuid,
  content      text,
  mood         text,
  mood_emoji   text,
  anonymous    boolean,
  owner_id     uuid,
  created_at   timestamptz,
  similarity   float
)
language sql stable
as $$
  select
    id,
    content,
    mood,
    mood_emoji,
    anonymous,
    owner_id,
    created_at,
    round((1 - (embedding <=> query_embedding))::numeric, 4)::float as similarity
  from mood_posts
  where
    visibility = 'public'
    and embedding is not null
    and content is not null
    and length(content) > 5
    and (exclude_owner is null or owner_id <> exclude_owner)
    and (1 - (embedding <=> query_embedding)) >= match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Done! Verify with:
-- select column_name, data_type from information_schema.columns
-- where table_name = 'mood_posts' and column_name = 'embedding';
