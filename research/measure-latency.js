#!/usr/bin/env node
/**
 * research/measure-latency.js
 *
 * Latency Measurement Experiment
 * Uses the research endpoint /api/research/match-ablation (τ=0.65)
 * which returns latency_embed_ms and latency_ann_ms separately.
 *
 * Runs N_SAMPLES requests, then computes p50 and p95 for:
 *   - Embedding latency (L_embed)
 *   - ANN latency (L_ann)
 *   - Total E2E latency (L_total)
 *
 * Saves: research/output/latency_report.txt + latency_raw.csv
 *
 * Usage:
 *   node research/measure-latency.js
 */

const fs = require("fs");
const path = require("path");
const { QUERIES } = require("./queries");

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "output");
const N_SAMPLES = 50;  // number of measurement calls
const THRESHOLD = 0.65;
const DELAY_MS = 1500;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function percentile(sortedArr, p) {
    if (sortedArr.length === 0) return null;
    const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))];
}

function stats(arr) {
    if (arr.length === 0) return { min: null, max: null, mean: null, p50: null, p95: null };
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: Math.round(mean),
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
    };
}

async function measure(text) {
    const wallStart = Date.now();
    try {
        const res = await fetch(`${BASE_URL}/api/research/match-ablation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, threshold: THRESHOLD }),
            signal: AbortSignal.timeout(35000),
        });
        const wallTotal = Date.now() - wallStart;
        if (!res.ok) return null;
        const data = await res.json();
        return {
            embed: data.latency_embed_ms ?? null,
            ann: data.latency_ann_ms ?? null,
            total: wallTotal,
        };
    } catch {
        return null;
    }
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`\n⏱️  FeelUp Latency Measurement`);
    console.log(`   Samples: ${N_SAMPLES} | Threshold: ${THRESHOLD}\n`);

    const samples = { embed: [], ann: [], total: [] };
    const csvRows = ["sample,latency_embed_ms,latency_ann_ms,latency_total_ms"];

    let failures = 0;

    for (let i = 0; i < N_SAMPLES; i++) {
        // Rotate through queries to get natural variation
        const query = QUERIES[i % QUERIES.length];
        process.stdout.write(`   Sample ${String(i + 1).padStart(2, "0")}/${N_SAMPLES}  `);

        const result = await measure(query.text);
        if (!result || result.embed === null) {
            process.stdout.write(`❌ failed\n`);
            failures++;
            await sleep(DELAY_MS);
            continue;
        }

        samples.embed.push(result.embed);
        samples.ann.push(result.ann);
        samples.total.push(result.total);

        process.stdout.write(
            `embed=${result.embed}ms  ann=${result.ann}ms  total=${result.total}ms\n`
        );
        csvRows.push(`${i + 1},${result.embed},${result.ann},${result.total}`);

        await sleep(DELAY_MS);
    }

    const embedStats = stats(samples.embed);
    const annStats = stats(samples.ann);
    const totalStats = stats(samples.total);

    const lines = [];
    lines.push("═══════════════════════════════════════════════════════════════════");
    lines.push("  FeelUp Semantic Matching — Latency Report");
    lines.push(`  Samples collected: ${samples.total.length}/${N_SAMPLES} (${failures} failures)`);
    lines.push("═══════════════════════════════════════════════════════════════════");
    lines.push("");
    lines.push("  Component           min    mean   p50    p95    max   (all ms)");
    lines.push("  ──────────────────────────────────────────────────────────────");

    function fmtRow(label, s) {
        const f = (v) => (v === null ? "N/A" : String(v)).padEnd(7);
        return `  ${label.padEnd(20)}${f(s.min)}${f(s.mean)}${f(s.p50)}${f(s.p95)}${f(s.max)}`;
    }

    lines.push(fmtRow("L_embed (CF/HF)", embedStats));
    lines.push(fmtRow("L_ann   (HNSW)", annStats));
    lines.push(fmtRow("L_total (E2E)", totalStats));

    lines.push("");
    lines.push("  ──────────────────────────────────────────────────────────────");
    lines.push("  NOTE: L_embed includes Cloudflare OR HuggingFace network time.");
    lines.push("  A bimodal distribution in p95 vs p50 indicates fallback usage.");
    lines.push("  Paste p50 and p95 columns into IEEE Table V (Latency Breakdown).");
    lines.push("═══════════════════════════════════════════════════════════════════\n");

    const report = lines.join("\n");
    console.log("\n" + report);

    const reportPath = path.join(OUTPUT_DIR, "latency_report.txt");
    const csvPath = path.join(OUTPUT_DIR, "latency_raw.csv");
    fs.writeFileSync(reportPath, report, "utf8");
    fs.writeFileSync(csvPath, csvRows.join("\n"), "utf8");

    console.log(`✅ Report saved: ${reportPath}`);
    console.log(`✅ Raw CSV saved: ${csvPath}\n`);
}

main().catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
});
