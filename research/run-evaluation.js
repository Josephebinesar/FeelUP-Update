#!/usr/bin/env node
/**
 * research/run-evaluation.js
 *
 * Calls /api/match-peers for each of the 30 benchmark queries.
 * Saves raw results to: research/output/raw_results.csv
 * Saves annotation template to: research/output/annotation_template.csv
 *
 * Usage:
 *   node research/run-evaluation.js
 *
 * Prerequisites:
 *   - npm run dev must be running on localhost:3000
 *   - At least some posts must have embeddings in Supabase
 */

const fs = require("fs");
const path = require("path");
const { QUERIES } = require("./queries");

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "output");
const THRESHOLD = 0.65; // deployed threshold
const K = 5;
const DELAY_MS = 2000; // wait between calls to avoid overloading HF

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(val) {
    if (val === null || val === undefined) return "";
    const s = String(val).replace(/"/g, '""');
    return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
}

function rowToCsv(cols) {
    return cols.map(csvEscape).join(",");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function callMatchPeers(queryText, threshold = THRESHOLD) {
    const start = Date.now();
    try {
        const res = await fetch(`${BASE_URL}/api/match-peers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: queryText, owner_id: null }),
            signal: AbortSignal.timeout(30000),
        });
        const latency = Date.now() - start;
        const data = await res.json();
        return { ok: res.ok, latency, matches: data.matches || [], reason: data.reason || "" };
    } catch (e) {
        return { ok: false, latency: Date.now() - start, matches: [], reason: e.message };
    }
}

async function main() {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const rawRows = [];
    const annotationRows = [];

    const rawHeader = [
        "query_id", "domain", "query_text",
        "rank", "post_id", "post_mood", "post_content_preview",
        "similarity_score_pct", "is_anonymous", "latency_ms",
    ];

    const annotationHeader = [
        "query_id", "domain", "query_text",
        "rank", "post_id", "post_mood", "post_content_preview",
        "similarity_score_pct",
        "relevant_annotator_1",  // fill: 1=relevant, 0=not relevant
        "relevant_annotator_2",  // fill: 1=relevant, 0=not relevant
        "notes",
    ];

    rawRows.push(rawHeader);
    annotationRows.push(annotationHeader);

    console.log(`\n🔬 FeelUp Semantic Matching Evaluation`);
    console.log(`   Queries: ${QUERIES.length} | Threshold: ${THRESHOLD} | K: ${K}`);
    console.log(`   Output: ${OUTPUT_DIR}\n`);

    let totalQueries = 0;
    let zeroHits = 0;
    const allScores = [];
    const allLatencies = [];

    for (const query of QUERIES) {
        process.stdout.write(`   [${query.id}] ${query.text.slice(0, 55)}… `);

        const result = await callMatchPeers(query.text, THRESHOLD);
        allLatencies.push(result.latency);
        totalQueries++;

        if (!result.ok || result.matches.length === 0) {
            zeroHits++;
            process.stdout.write(`❌ zero hits (${result.reason || "no matches"})\n`);

            // Write one row indicating zero hits
            rawRows.push(rowToCsv([
                query.id, query.domain, query.text,
                "—", "—", "—", "NO MATCHES RETURNED", "—", "—", result.latency,
            ]));
            annotationRows.push(rowToCsv([
                query.id, query.domain, query.text,
                "—", "—", "—", "NO MATCHES RETURNED", "—", "", "", "",
            ]));
        } else {
            process.stdout.write(`✅ ${result.matches.length} matches (${result.latency}ms)\n`);

            for (let rank = 0; rank < result.matches.length; rank++) {
                const m = result.matches[rank];
                const preview = (m.content || "").slice(0, 120).replace(/\n/g, " ");
                allScores.push(m.similarity);

                rawRows.push(rowToCsv([
                    query.id, query.domain, query.text,
                    rank + 1, m.id, m.mood || "", preview,
                    m.similarity, m.anonymous, result.latency,
                ]));

                annotationRows.push(rowToCsv([
                    query.id, query.domain, query.text,
                    rank + 1, m.id, m.mood || "", preview,
                    m.similarity,
                    "", // annotator 1 — fill manually
                    "", // annotator 2 — fill manually
                    "", // notes
                ]));
            }
        }

        await sleep(DELAY_MS);
    }

    // Write CSVs
    const rawPath = path.join(OUTPUT_DIR, "raw_results.csv");
    const annotationPath = path.join(OUTPUT_DIR, "annotation_template.csv");

    fs.writeFileSync(rawPath, rawRows.join("\n"), "utf8");
    fs.writeFileSync(annotationPath, annotationRows.join("\n"), "utf8");

    // Print quick summary stats (NOT final paper numbers — those come from annotated CSV)
    const avgLatency = Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length);
    const avgScore = allScores.length
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
        : "N/A";

    console.log("\n─────────────────────────────────────────────────────");
    console.log(`📊 Raw Summary (before manual annotation)`);
    console.log(`   Total queries     : ${totalQueries}`);
    console.log(`   Zero-hit queries  : ${zeroHits} (${((zeroHits / totalQueries) * 100).toFixed(1)}%)`);
    console.log(`   Avg similarity %  : ${avgScore}%  (raw, not precision)`);
    console.log(`   Avg latency       : ${avgLatency}ms`);
    console.log(`   Raw results saved : ${rawPath}`);
    console.log(`   Annotation file   : ${annotationPath}`);
    console.log(`\n   ⚠️  Open annotation_template.csv and fill in:`);
    console.log(`      relevant_annotator_1 and relevant_annotator_2`);
    console.log(`      with 1 (relevant) or 0 (not relevant) for each row.`);
    console.log(`   Then run: node research/compute-metrics.js\n`);
}

main().catch((e) => {
    console.error("Fatal error:", e.message);
    process.exit(1);
});
