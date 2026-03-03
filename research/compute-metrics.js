#!/usr/bin/env node
/**
 * research/compute-metrics.js
 *
 * Reads the manually annotated CSV (research/output/annotation_template.csv)
 * and computes:
 *   - Precision@5 per query and overall
 *   - Average Cosine Similarity (ACS)
 *   - Zero-hit rate
 *   - Inter-annotator agreement (Cohen's Kappa)
 *   - Per-domain breakdown
 *
 * Usage:
 *   node research/compute-metrics.js
 *
 * Prerequisite:
 *   Fill in relevant_annotator_1 and relevant_annotator_2 columns in:
 *   research/output/annotation_template.csv
 */

const fs = require("fs");
const path = require("path");

const ANNOTATION_PATH = path.join(__dirname, "output", "annotation_template.csv");
const METRICS_PATH = path.join(__dirname, "output", "metrics_report.txt");
const K = 5;

// ── CSV parser (no external deps) ────────────────────────────────────────────

function parseCsv(content) {
    const lines = content.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
        const cols = [];
        let cur = "";
        let inQuote = false;
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; continue; }
            if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
            cur += ch;
        }
        cols.push(cur.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
        return obj;
    });
}

// ── Cohen's Kappa ─────────────────────────────────────────────────────────────

function cohensKappa(a1Labels, a2Labels) {
    const n = a1Labels.length;
    if (n === 0) return null;
    let agree = 0;
    let a1pos = 0, a2pos = 0;
    for (let i = 0; i < n; i++) {
        if (a1Labels[i] === a2Labels[i]) agree++;
        if (a1Labels[i] === 1) a1pos++;
        if (a2Labels[i] === 1) a2pos++;
    }
    const po = agree / n;
    const p1 = (a1pos / n) * (a2pos / n);
    const p0 = ((n - a1pos) / n) * ((n - a2pos) / n);
    const pe = p1 + p0;
    if (pe === 1) return 1;
    return ((po - pe) / (1 - pe)).toFixed(4);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    if (!fs.existsSync(ANNOTATION_PATH)) {
        console.error(`❌  File not found: ${ANNOTATION_PATH}`);
        console.error(`    Run: node research/run-evaluation.js first.`);
        process.exit(1);
    }

    const rows = parseCsv(fs.readFileSync(ANNOTATION_PATH, "utf8"));

    // Group rows by query_id
    const byQuery = {};
    for (const row of rows) {
        const qid = row["query_id"];
        if (!qid || qid === "query_id") continue;
        if (!byQuery[qid]) byQuery[qid] = { domain: row["domain"], query: row["query_text"], results: [] };
        if (row["post_id"] !== "—") byQuery[qid].results.push(row);
    }

    const domains = {};
    let totalPrecision = 0;
    let queryCount = 0;
    let zeroHits = 0;
    const allScores = [];
    const allA1 = [], allA2 = [];
    const lines = [];

    lines.push("═══════════════════════════════════════════════════════════════");
    lines.push("   FeelUp Semantic Peer Matching — Evaluation Metrics Report");
    lines.push("═══════════════════════════════════════════════════════════════\n");

    for (const [qid, qdata] of Object.entries(byQuery)) {
        queryCount++;
        const domain = qdata.domain;
        if (!domains[domain]) domains[domain] = { precision: [], scores: [] };

        if (qdata.results.length === 0) {
            zeroHits++;
            domains[domain].precision.push(0);
            totalPrecision += 0;
            lines.push(`[${qid}] Zero hits → P@5 = 0.00`);
            continue;
        }

        let relevantCount = 0;
        const topK = qdata.results.slice(0, K);

        for (const r of topK) {
            const a1 = parseInt(r["relevant_annotator_1"] || "0");
            const a2 = parseInt(r["relevant_annotator_2"] || "0");

            // Use consensus label (both must agree = 1 for relevant)
            const consensus = a1 === 1 && a2 === 1 ? 1 : 0;
            if (consensus === 1) relevantCount++;

            allA1.push(a1);
            allA2.push(a2);

            const score = parseFloat(r["similarity_score_pct"] || "0");
            if (!isNaN(score) && score > 0) {
                allScores.push(score);
                domains[domain].scores.push(score);
            }
        }

        const p5 = relevantCount / Math.min(K, topK.length);
        totalPrecision += p5;
        domains[domain].precision.push(p5);

        lines.push(`[${qid}] Results: ${topK.length} | Relevant: ${relevantCount} | P@${K} = ${p5.toFixed(2)}`);
    }

    // ── Overall Metrics ───────────────────────────────────────────────────────

    const overallP5 = queryCount > 0 ? (totalPrecision / queryCount).toFixed(4) : "N/A";
    const acs = allScores.length > 0
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length / 100).toFixed(4)
        : "N/A";
    const zeroHitRate = ((zeroHits / queryCount) * 100).toFixed(1);
    const kappa = cohensKappa(allA1, allA2);

    lines.push("\n───────────────────────────────────────────────────────────────");
    lines.push("  OVERALL RESULTS");
    lines.push("───────────────────────────────────────────────────────────────");
    lines.push(`  Total queries           : ${queryCount}`);
    lines.push(`  Zero-hit queries        : ${zeroHits} (${zeroHitRate}%)`);
    lines.push(`  Overall Precision@${K}    : ${overallP5}`);
    lines.push(`  Average Cosine Sim.     : ${acs}  (raw score 0–1)`);
    lines.push(`  Cohen's Kappa (κ)       : ${kappa ?? "N/A (fill both annotators)"}`);

    // ── Per-Domain Breakdown ──────────────────────────────────────────────────

    lines.push("\n───────────────────────────────────────────────────────────────");
    lines.push("  PER-DOMAIN BREAKDOWN");
    lines.push("───────────────────────────────────────────────────────────────");

    for (const [domain, data] of Object.entries(domains)) {
        const dp5 = data.precision.length > 0
            ? (data.precision.reduce((a, b) => a + b, 0) / data.precision.length).toFixed(4)
            : "N/A";
        const dacs = data.scores.length > 0
            ? (data.scores.reduce((a, b) => a + b, 0) / data.scores.length / 100).toFixed(4)
            : "N/A";
        lines.push(`  ${domain.padEnd(25)} P@${K}: ${dp5}   ACS: ${dacs}`);
    }

    lines.push("\n═══════════════════════════════════════════════════════════════");
    lines.push("  Paste these numbers into IEEE Table II (Evaluation Results)");
    lines.push("═══════════════════════════════════════════════════════════════\n");

    const report = lines.join("\n");
    console.log(report);
    fs.writeFileSync(METRICS_PATH, report, "utf8");
    console.log(`\n✅ Full report saved to: ${METRICS_PATH}`);
}

main();
