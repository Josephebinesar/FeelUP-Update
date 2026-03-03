#!/usr/bin/env python3
"""
research/baseline_tfidf.py

Baseline B2: TF-IDF Cosine Similarity
Fetches all public mood_posts from Supabase, builds a TF-IDF matrix,
then retrieves Top-5 posts per query using cosine similarity.

Saves: research/output/baseline_tfidf.csv

Usage:
    pip install scikit-learn python-dotenv supabase
    python research/baseline_tfidf.py

Requirements file (pip install):
    scikit-learn>=1.3
    python-dotenv>=1.0
    supabase>=2.0
"""

import os
import csv
import time
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env.local ──────────────────────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env.local")

# ── Imports ──────────────────────────────────────────────────────────────────
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    from supabase import create_client
except ImportError as e:
    raise SystemExit(f"❌ Missing dependency: {e}\n   pip install scikit-learn python-dotenv supabase")

# ── Benchmark queries (same as queries.js) ────────────────────────────────────
QUERIES = [
    # Domain A: Academic Stress
    ("A01", "Academic Stress", "I am terrified of checking my semester results because I know I will fail"),
    ("A02", "Academic Stress", "My engineering backlog is making me feel like a complete failure with no future"),
    ("A03", "Academic Stress", "I cannot concentrate on studying because the placement season is making me panic"),
    ("A04", "Academic Stress", "Everyone else in my class got internships and I am still sitting at home doing nothing"),
    ("A05", "Academic Stress", "I spent three months preparing for the interview and still got rejected, I feel worthless"),
    ("A06", "Academic Stress", "My parents paid so much for my education and I am returning home with no degree"),
    ("A07", "Academic Stress", "Every time I open the textbook my mind goes blank and I cannot retain anything"),
    ("A08", "Academic Stress", "I missed so many classes this semester I do not even know what subjects I am failing"),
    ("A09", "Academic Stress", "The competitive pressure from my peers is stopping me from sleeping at night"),
    ("A10", "Academic Stress", "My CGPA is too low to apply to any company and I do not know what to do next"),
    # Domain B: Emotional Distress
    ("B01", "Emotional Distress", "I wake up every morning with this heavy feeling in my chest and I do not know why"),
    ("B02", "Emotional Distress", "I have been pretending to be okay for so long I forgot what actually okay feels like"),
    ("B03", "Emotional Distress", "Nothing brings me happiness anymore, everything just feels grey and pointless"),
    ("B04", "Emotional Distress", "I keep crying without any reason and I am too embarrassed to tell anyone"),
    ("B05", "Emotional Distress", "I feel completely drained all the time even after sleeping for ten hours"),
    ("B06", "Emotional Distress", "There is a voice in my head constantly telling me I am not good enough for anything"),
    ("B07", "Emotional Distress", "I do not see the point of continuing, every effort I make ends in disappointment"),
    ("B08", "Emotional Distress", "My anxiety makes my heart race even when nothing is happening, it is exhausting"),
    ("B09", "Emotional Distress", "I have been numb for weeks, I cannot feel happy or sad, just empty"),
    ("B10", "Emotional Distress", "The smallest things trigger me now and I hate how sensitive I have become"),
    # Domain C: Social & Relational
    ("C01", "Social & Relational", "I am surrounded by people all day but I have never felt more alone in my life"),
    ("C02", "Social & Relational", "My parents compare me to my cousin every single day and it is destroying my confidence"),
    ("C03", "Social & Relational", "I had to end a three year friendship because it was becoming too toxic but I miss them"),
    ("C04", "Social & Relational", "Nobody checks on me first, I am always the one starting conversations and I am tired"),
    ("C05", "Social & Relational", "My family expects me to be the responsible one and I am breaking under that weight"),
    ("C06", "Social & Relational", "I feel invisible in my friend group, like I could disappear and no one would notice"),
    ("C07", "Social & Relational", "My roommate situation is making home feel unsafe and I have nowhere else to go"),
    ("C08", "Social & Relational", "I told my best friend how I was feeling and they just changed the subject"),
    ("C09", "Social & Relational", "Social media makes me feel like everyone has their life together except me"),
    ("C10", "Social & Relational", "I moved to a new city for college and I have not made a single real friend in a year"),
]

K = 5
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("\n📊 Baseline B2: TF-IDF Cosine Similarity")

    # ── Step 1: Fetch corpus from Supabase ────────────────────────────────────
    print("   Fetching public mood_posts from Supabase...")
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Fetch in pages to get all public posts
    all_posts = []
    page_size = 1000
    offset = 0
    while True:
        result = (
            sb.table("mood_posts")
            .select("id, content, mood")
            .eq("visibility", "public")
            .not_.is_("content", "null")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = result.data or []
        all_posts.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    # Filter to posts with non-trivial content
    corpus_posts = [p for p in all_posts if p.get("content") and len(p["content"].strip()) > 5]
    print(f"   Corpus size: {len(corpus_posts)} posts")

    if not corpus_posts:
        raise SystemExit("❌ No posts found in corpus. Ensure mood_posts table has public posts.")

    # ── Step 2: Build TF-IDF Matrix ──────────────────────────────────────────
    corpus_texts = [f"{p.get('mood', 'Neutral')}: {p['content'].strip()}" for p in corpus_posts]

    print("   Building TF-IDF matrix...")
    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.95,
        sublinear_tf=True,
    )

    corpus_matrix = vectorizer.fit_transform(corpus_texts)
    print(f"   Matrix shape: {corpus_matrix.shape}  (posts × vocab)")

    # ── Step 3: Query each benchmark query ───────────────────────────────────
    rows = [[
        "query_id", "domain", "query_text", "vocab_size",
        "rank", "post_id", "post_mood", "post_content_preview",
        "tfidf_cosine_score",
        "relevant_annotator_1", "relevant_annotator_2", "notes",
    ]]

    zero_hits = 0
    all_scores = []

    for qid, domain, query_text in QUERIES:
        t0 = time.time()
        query_vec = vectorizer.transform([query_text])
        sims = cosine_similarity(query_vec, corpus_matrix)[0]
        top_k_idx = np.argsort(sims)[::-1][:K]
        latency_ms = round((time.time() - t0) * 1000, 1)

        top_results = [(idx, sims[idx]) for idx in top_k_idx if sims[idx] > 0.0]

        if not top_results:
            zero_hits += 1
            print(f"   [{qid}] ZERO HITS  ({latency_ms}ms)")
            rows.append([qid, domain, query_text, corpus_matrix.shape[1],
                         "—", "—", "—", "NO TF-IDF MATCHES", "—", "", "", ""])
        else:
            print(f"   [{qid}] {len(top_results)} results | top={top_results[0][1]:.4f} | {latency_ms}ms")
            for rank, (idx, score) in enumerate(top_results):
                post = corpus_posts[idx]
                preview = post["content"][:120].replace("\n", " ")
                all_scores.append(score)
                rows.append([
                    qid, domain, query_text, corpus_matrix.shape[1],
                    rank + 1, post["id"], post.get("mood", ""),
                    preview, round(float(score), 4),
                    "", "", "",  # annotation columns — fill manually
                ])

    # ── Step 4: Save CSV ──────────────────────────────────────────────────────
    csv_path = OUTPUT_DIR / "baseline_tfidf.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)

    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

    print(f"\n  ─────────────────────────────────────────────────────────")
    print(f"  Vocabulary size       : {corpus_matrix.shape[1]}")
    print(f"  Zero-hit queries      : {zero_hits}/{len(QUERIES)} ({100*zero_hits/len(QUERIES):.1f}%)")
    print(f"  Avg TF-IDF cos. sim.  : {avg_score:.4f}")
    print(f"  Saved to              : {csv_path}")
    print(f"\n  Fill in relevant_annotator_1/2 columns and compute P@5")
    print(f"  to compare against semantic search results.\n")

if __name__ == "__main__":
    main()
