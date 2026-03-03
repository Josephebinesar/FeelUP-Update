# FeelUp — Research Evaluation Toolkit

This folder contains all scripts for the IEEE/Scopus paper experimental evaluation.
**All scripts collect real measurements from your live system. No values are fabricated.**

---

## Folder Structure

```
research/
├── queries.js               # 30 benchmark queries (3 domains × 10)
├── run-evaluation.js        # Section B: runs queries, saves raw + annotation CSV
├── compute-metrics.js       # Section D: computes P@5, ACS, Kappa from annotated CSV
├── run-ablation.js          # Section E: threshold ablation τ ∈ {0.50, 0.65, 0.80}
├── measure-latency.js       # Section F: p50/p95 latency measurement (50 samples)
├── baseline-ilike.js        # Section H: SQL ILIKE baseline
├── baseline_tfidf.py        # Section H: TF-IDF baseline (Python)
└── output/                  # All generated files (auto-created)
    ├── raw_results.csv
    ├── annotation_template.csv   ← FILL THIS IN MANUALLY
    ├── metrics_report.txt
    ├── ablation_results.csv
    ├── latency_report.txt
    ├── latency_raw.csv
    ├── baseline_ilike.csv
    └── baseline_tfidf.csv
```

---

## Step-by-Step Execution Order

### Prerequisites
- `npm run dev` must be running on `localhost:3000`
- Supabase has public posts with embeddings (run backfill if needed)

---

## A. Step 1 — Run Main Evaluation

```powershell
node research/run-evaluation.js
```

This will:
- Call `/api/match-peers` for all 30 queries
- Save `output/raw_results.csv` (system results)
- Save `output/annotation_template.csv` (empty columns for human labeling)

**Time needed:** ~2 minutes (2s delay between queries)

---

## B. Step 2 — Manual Annotation

Open `research/output/annotation_template.csv` in Excel or Google Sheets.

For every row (each is one retrieved post for one query):
- Fill `relevant_annotator_1`: `1` if the post is emotionally/semantically relevant to the query, `0` if not
- Fill `relevant_annotator_2`: Same, independently (second human annotator)

**Annotation rules:**
- A post is **relevant** if it expresses a psychologically similar stressor to the query
- Relevance is assessed on **meaning**, NOT on exact word overlap
- If `post_content_preview` is `NO MATCHES RETURNED`, leave blank
- Two annotators MUST annotate independently without seeing each other's labels

---

## C. Step 3 — Compute Metrics

```powershell
node research/compute-metrics.js
```

Outputs to console and `output/metrics_report.txt`:
- Overall Precision@5
- Average Cosine Similarity (ACS)
- Zero-hit rate
- Cohen's κ (inter-annotator agreement)
- Per-domain breakdown (Academic, Emotional, Social)

**Paste these into IEEE Table II.**

---

## D. Step 4 — Threshold Ablation

```powershell
node research/run-ablation.js
```

Runs all 30 queries at τ ∈ {0.50, 0.65, 0.80} using `/api/research/match-ablation`.
Prints a formatted summary table and saves `output/ablation_results.csv`.

**Paste the printed table into IEEE Table III.**

---

## E. Step 5 — Latency Measurement

```powershell
node research/measure-latency.js
```

Collects 50 timed samples. Reports:
- `L_embed` (p50/p95) — embedding generation time
- `L_ann` (p50/p95) — HNSW index query time  
- `L_total` (p50/p95) — end-to-end wall clock

**Paste into IEEE Table V (Latency Breakdown).**

---

## F. Step 6 — Scalability Test (Supabase SQL Editor)

Run these in your **Supabase SQL Editor** to measure HNSW vs brute-force.

### 6a. Check current corpus size
```sql
select count(*) as total_posts,
       count(embedding) as embedded_posts
from mood_posts
where visibility = 'public';
```

### 6b. EXPLAIN ANALYZE — HNSW query (your deployed system)
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, content, mood,
       round((1 - (embedding <=> (
         SELECT embedding FROM mood_posts LIMIT 1
       )))::numeric, 4) AS similarity
FROM mood_posts
WHERE visibility = 'public'
  AND embedding IS NOT NULL
  AND (1 - (embedding <=> (SELECT embedding FROM mood_posts LIMIT 1))) >= 0.65
ORDER BY embedding <=> (SELECT embedding FROM mood_posts LIMIT 1)
LIMIT 5;
```

Copy the output. Look for:
- `Index Scan using mood_posts_embedding_hnsw_idx` ← confirms HNSW is used
- `Execution Time: X ms` ← this is your L_ann value

### 6c. EXPLAIN ANALYZE — Brute-force (disable index for comparison)
```sql
SET enable_indexscan = off;
SET enable_bitmapscan = off;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, content, mood,
       round((1 - (embedding <=> (
         SELECT embedding FROM mood_posts LIMIT 1
       )))::numeric, 4) AS similarity
FROM mood_posts
WHERE visibility = 'public'
  AND embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM mood_posts LIMIT 1)
LIMIT 5;

-- Reset after test
SET enable_indexscan = on;
SET enable_bitmapscan = on;
```

Compare `Execution Time` between HNSW and brute-force.
**Paste both times into IEEE Table IV (Scalability).**

---

## G. Step 7 — SQL ILIKE Baseline

```powershell
node research/baseline-ilike.js
```

Saves `output/baseline_ilike.csv`.
Annotate it with relevance labels (same process as Step 2).
Compute P@5 manually or with `compute-metrics.js` after renaming the file.

---

## H. Step 8 — TF-IDF Baseline (Python)

```powershell
pip install scikit-learn python-dotenv supabase
python research/baseline_tfidf.py
```

Saves `output/baseline_tfidf.csv`.
Annotate relevance labels the same way as Step 2.

---

## Summary: What to Paste Where in the IEEE Paper

| Script Output | IEEE Section |
|---|---|
| `metrics_report.txt` → P@5, ACS | Table II: Main Results |
| `ablation_results.csv` → printed table | Table III: Threshold Ablation |
| `latency_report.txt` → p50/p95 | Table V: Latency Breakdown |
| EXPLAIN ANALYZE (Supabase) | Table IV: Scalability |
| `baseline_ilike.csv` + annotated P@5 | Table II: Baseline B1 |
| `baseline_tfidf.csv` + annotated P@5 | Table II: Baseline B2 |
