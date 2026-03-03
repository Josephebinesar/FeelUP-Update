#!/usr/bin/env node
/**
 * research/run-ablation.js
 *
 * Threshold Ablation Study — runs all 30 queries at τ ∈ {0.50, 0.65, 0.80}
 * Uses the research-only endpoint: /api/research/match-ablation
 * Does NOT touch the production /api/match-peers endpoint.
 *
 * Saves: research/output/ablation_results.csv
 *
 * Usage:
 *   node research/run-ablation.js
 */

const fs = require("fs");
const path = require("path");
const { QUERIES } = require("./queries");

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "output");
const THRESHOLDS = [0.50, 0.65, 0.80];
const DELAY_MS = 2200;

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

async function callAblation(text, threshold) {
    const start = Date.now();
    try {
        const res = await fetch(`${BASE_URL}/api/research/match-ablation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, threshold, match_count: 5 }),
            signal: AbortSignal.timeout(35000),
        });
        const latency = Date.now() - start;
        const data = await res.json();
        return {
            ok: res.ok,
            latency,
            count: data.count ?? 0,
            matches: data.matches ?? [],
            latency_embed_ms: data.latency_embed_ms ?? null,
            latency_ann_ms: data.latency_ann_ms ?? null,
        };
    } catch (e) {
        return { ok: false, latency: Date.now() - start, count: 0, matches: [], latency_embed_ms: null, latency_ann_ms: null };
    }
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const rows = [
        rowToCsv([
            "threshold", "query_id", "domain",
            "matches_returned", "zero_hit",
            "avg_similarity_pct", "max_similarity_pct", "min_similarity_pct",
            "latency_embed_ms", "latency_ann_ms", "latency_total_ms",
        ]),
    ];

    // Summary accumulator per threshold
    const summary = {};
    for (const t of THRESHOLDS) {
        summary[t] = { totalMatches: 0, zeroHits: 0, allScores: [], allLatencies: [] };
    }

    console.log("\n🔬 Threshold Ablation Study");
    console.log(`   Thresholds: ${THRESHOLDS.join(", ")} | Queries: ${QUERIES.length}\n`);

    for (const threshold of THRESHOLDS) {
        console.log(`\n── τ = ${threshold} ──────────────────────────────────────────`);

        for (const query of QUERIES) {
            process.stdout.write(`   [${query.id}] τ=${threshold} → `);

            const result = await callAblation(query.text, threshold);
            const s = summary[threshold];

            const scores = result.matches.map((m) => m.similarity);
            const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
            const max = scores.length ? Math.max(...scores) : "—";
            const min = scores.length ? Math.min(...scores) : "—";

            if (result.count === 0) {
                s.zeroHits++;
                process.stdout.write(`ZERO HITS\n`);
            } else {
                s.totalMatches += result.count;
                s.allScores.push(...scores);
                process.stdout.write(`${result.count} matches | avg=${avg}% | ${result.latency}ms\n`);
            }

            s.allLatencies.push(result.latency);

            rows.push(rowToCsv([
                threshold,
                query.id,
                query.domain,
                result.count,
                result.count === 0 ? 1 : 0,
                avg,
                max,
                min,
                result.latency_embed_ms ?? "",
                result.latency_ann_ms ?? "",
                result.latency,
            ]));

            await sleep(DELAY_MS);
        }
    }

    // Print summary table
    console.log("\n\n═══════════════════════════════════════════════════════════════");
    console.log("  ABLATION STUDY SUMMARY TABLE");
    console.log("  (Paste this into IEEE Table III — Threshold Ablation)");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`  ${"τ".padEnd(6)} ${"Zero-Hit%".padEnd(12)} ${"Avg Matches".padEnd(14)} ${"Avg Sim%".padEnd(12)} ${"Avg Latency".padEnd(12)}`);
    console.log("  ─────────────────────────────────────────────────────────────");

    for (const t of THRESHOLDS) {
        const s = summary[t];
        const n = QUERIES.length;
        const zeroHitPct = ((s.zeroHits / n) * 100).toFixed(1);
        const avgMatches = (s.totalMatches / n).toFixed(1);
        const avgSim =
            s.allScores.length > 0
                ? (s.allScores.reduce((a, b) => a + b, 0) / s.allScores.length).toFixed(1)
                : "N/A";
        const avgLatency =
            s.allLatencies.length > 0
                ? Math.round(s.allLatencies.reduce((a, b) => a + b, 0) / s.allLatencies.length)
                : "N/A";

        const marker = t === 0.65 ? " ← deployed" : "";
        console.log(`  ${String(t).padEnd(6)} ${(zeroHitPct + "%").padEnd(12)} ${avgMatches.padEnd(14)} ${(avgSim + "%").padEnd(12)} ${(avgLatency + "ms").padEnd(12)}${marker}`);
    }

    console.log("═══════════════════════════════════════════════════════════════\n");

    const outPath = path.join(OUTPUT_DIR, "ablation_results.csv");
    fs.writeFileSync(outPath, rows.join("\n"), "utf8");
    console.log(`✅ Full ablation results saved to: ${outPath}\n`);
}

main().catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
});
