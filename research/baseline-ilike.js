#!/usr/bin/env node
/**
 * research/baseline-ilike.js
 *
 * Baseline B1: SQL ILIKE (Lexical Search)
 *
 * For each of the 30 benchmark queries:
 *   - Extracts top-3 non-stopword tokens from the query string
 *   - Issues a Supabase query: content ILIKE '%token%'
 *   - Returns up to 5 results
 *   - Records result count and first 5 post previews
 *
 * Saves: research/output/baseline_ilike.csv
 *
 * Usage:
 *   node research/baseline-ilike.js
 *
 * Requires env vars from .env.local to be set.
 * Reads them by requiring dotenv inline if available, else from process.env.
 */

const fs = require("fs");
const path = require("path");
const { QUERIES } = require("./queries");

// Load env from .env.local (dotenv not required — read manually)
function loadEnv() {
    const envPath = path.join(__dirname, "..", ".env.local");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^"|"$/g, "");
            if (!process.env[key]) process.env[key] = val;
        }
    }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env.local");
    process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "output");
const K = 5;

// Simple stopword list
const STOPWORDS = new Set([
    "i", "am", "is", "are", "the", "a", "an", "and", "or", "but", "in",
    "on", "at", "to", "for", "of", "with", "my", "me", "we", "it", "do",
    "not", "no", "so", "too", "very", "just", "have", "has", "had",
    "be", "been", "being", "that", "this", "about", "more", "feel", "feeling",
]);

function extractKeywords(text, n = 3) {
    return text
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w))
        .slice(0, n);
}

function csvEscape(val) {
    if (val === null || val === undefined) return "";
    const s = String(val).replace(/"/g, '""');
    return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
}

function rowToCsv(cols) {
    return cols.map(csvEscape).join(",");
}

async function supabaseFetch(endpoint, params) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.json();
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const rows = [
        rowToCsv([
            "query_id", "domain", "query_text", "keywords_used",
            "results_returned", "zero_hit",
            "rank", "post_id", "post_mood", "post_content_preview",
        ]),
    ];

    console.log("\n🔎 Baseline B1: SQL ILIKE Search");
    console.log(`   Queries: ${QUERIES.length} | K: ${K}\n`);

    let zeroHits = 0;
    let totalResults = 0;

    for (const query of QUERIES) {
        const keywords = extractKeywords(query.text);
        process.stdout.write(`   [${query.id}] keywords=[${keywords.join(", ")}] → `);

        try {
            if (keywords.length === 0) {
                zeroHits++;
                process.stdout.write(`skipped (no keywords)\n`);
                rows.push(rowToCsv([query.id, query.domain, query.text, "none", 0, 1, "—", "—", "—", "NO KEYWORDS"]));
                continue;
            }

            // Build OR filter: content ILIKE '%kw1%' OR content ILIKE '%kw2%'
            const ilikeFilter = keywords.map((kw) => `content.ilike.*${kw}*`).join(",");

            const data = await supabaseFetch("mood_posts", {
                select: "id,content,mood",
                "visibility": "eq.public",
                or: ilikeFilter,
                limit: K,
            });

            if (!data || data.length === 0) {
                zeroHits++;
                process.stdout.write(`ZERO HITS\n`);
                rows.push(rowToCsv([query.id, query.domain, query.text, keywords.join("|"), 0, 1, "—", "—", "—", "NO MATCHES"]));
                continue;
            }

            totalResults += data.length;
            process.stdout.write(`${data.length} results\n`);

            for (let rank = 0; rank < data.length; rank++) {
                const m = data[rank];
                const preview = (m.content || "").slice(0, 120).replace(/\n/g, " ");
                rows.push(rowToCsv([
                    query.id, query.domain, query.text, keywords.join("|"),
                    data.length, 0,
                    rank + 1, m.id, m.mood || "", preview,
                ]));
            }
        } catch (e) {
            process.stdout.write(`ERROR: ${e.message}\n`);
            rows.push(rowToCsv([query.id, query.domain, query.text, "error", 0, 1, "—", "—", "—", e.message]));
        }
    }

    const csvPath = path.join(OUTPUT_DIR, "baseline_ilike.csv");
    fs.writeFileSync(csvPath, rows.join("\n"), "utf8");

    console.log(`\n─────────────────────────────────────────────────────────`);
    console.log(`  Zero-hit queries : ${zeroHits}/${QUERIES.length} (${((zeroHits / QUERIES.length) * 100).toFixed(1)}%)`);
    console.log(`  Total results    : ${totalResults}`);
    console.log(`  Saved to         : ${csvPath}`);
    console.log(`\n  Annotate this file the same way as annotation_template.csv`);
    console.log(`  then compute P@5 manually to compare vs semantic search.\n`);
}

main().catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
});
