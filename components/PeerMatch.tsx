"use client";

import { useState } from "react";
import { Sparkles, Brain, Users, Loader2, ChevronRight, AlertCircle } from "lucide-react";

/**
 * PeerMatch — Semantic Peer-to-Peer Support Matching
 *
 * ML-powered component that finds other users experiencing emotionally
 * similar situations using 768-dim vector embeddings and cosine similarity.
 *
 * For the FeelUp Research Paper:
 *   "Semantic User Matching in Mental Health Forums using Vector Embeddings
 *    and K-Nearest Neighbours with pgvector"
 */

type MatchedPost = {
    id: string;
    content: string | null;
    mood: string | null;
    mood_emoji: string | null;
    anonymous: boolean;
    owner_id: string;
    created_at: string;
    similarity: number; // as percentage 0–100
};

type Props = {
    userId: string;
    defaultText?: string;
};

const MOOD_COLORS: Record<string, string> = {
    Happy: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Calm: "bg-blue-100 text-blue-800 border-blue-200",
    Excited: "bg-orange-100 text-orange-800 border-orange-200",
    Grateful: "bg-green-100 text-green-800 border-green-200",
    Thoughtful: "bg-indigo-100 text-indigo-800 border-indigo-200",
    Sad: "bg-slate-100 text-slate-700 border-slate-200",
    Anxious: "bg-pink-100 text-pink-800 border-pink-200",
    Angry: "bg-red-100 text-red-800 border-red-200",
    Neutral: "bg-gray-100 text-gray-700 border-gray-200",
};

function SimilarityBadge({ score }: { score: number }) {
    const color =
        score >= 90
            ? "bg-emerald-500"
            : score >= 75
                ? "bg-blue-500"
                : score >= 65
                    ? "bg-violet-500"
                    : "bg-gray-400";

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-bold ${color}`}
            title={`${score}% semantic similarity`}
        >
            <Brain className="w-3 h-3" />
            {score}% match
        </span>
    );
}

function MatchCard({
    post,
    onConnect,
}: {
    post: MatchedPost;
    onConnect: (post: MatchedPost) => void;
}) {
    const moodClass = MOOD_COLORS[post.mood ?? ""] ?? "bg-gray-100 text-gray-700 border-gray-200";
    const timeAgo = (() => {
        try {
            const diff = Date.now() - new Date(post.created_at).getTime();
            const h = Math.floor(diff / 3_600_000);
            if (h < 1) return "just now";
            if (h < 24) return `${h}h ago`;
            return `${Math.floor(h / 24)}d ago`;
        } catch {
            return "";
        }
    })();

    // Determine if we can show a connect button at all
    const canConnect =
        !post.anonymous &&
        post.owner_id &&
        post.owner_id !== "anonymous" &&
        post.owner_id.length > 10;

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 backdrop-blur-sm shadow-[0_8px_32px_-12px_rgba(0,0,0,0.2)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-16px_rgba(88,28,135,0.25)]">
            {/* Glow on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl" />
            </div>

            <div className="relative flex items-start justify-between gap-3 flex-wrap">
                {/* Mood badge */}
                {post.mood && (
                    <span
                        className={`shrink-0 text-xs border px-2 py-0.5 rounded-full font-semibold ${moodClass}`}
                    >
                        {post.mood_emoji ?? ""} {post.mood}
                    </span>
                )}
                <SimilarityBadge score={post.similarity} />
            </div>

            {/* Post content — anonymized & truncated */}
            <p className="relative mt-3 text-sm text-gray-800 line-clamp-3 italic leading-relaxed">
                &ldquo;{post.content?.trim() || "…"}&rdquo;
            </p>

            {/* Footer */}
            <div className="relative mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">
                    {post.anonymous ? "Anonymous" : "Community member"} · {timeAgo}
                </span>

                {canConnect && (
                    <button
                        onClick={() => onConnect(post)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline transition-colors"
                        type="button"
                    >
                        Send a wave 👋 <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function PeerMatch({ userId, defaultText = "" }: Props) {
    const [inputText, setInputText] = useState(defaultText);
    const [loading, setLoading] = useState(false);
    const [matches, setMatches] = useState<MatchedPost[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [connectMsg, setConnectMsg] = useState<string | null>(null);

    async function findMatches() {
        const text = inputText.trim();
        if (!text || text.length < 5) {
            setError("Please write at least a few words about how you're feeling.");
            return;
        }

        if (!userId) {
            setError("You need to be logged in to use peer matching.");
            return;
        }

        setLoading(true);
        setError(null);
        setMatches(null);
        setConnectMsg(null);

        try {
            const res = await fetch("/api/match-peers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, owner_id: userId }),
            });

            const data = await res.json();

            if (!res.ok || !Array.isArray(data?.matches)) {
                setError(
                    data?.reason ||
                    "Could not find matches right now. Make sure you've shared at least one mood post first."
                );
                return;
            }

            setMatches(data.matches);
            setHasSearched(true);
        } catch {
            setError("Network error — please check your connection.");
        } finally {
            setLoading(false);
        }
    }

    // "Send a wave" — opens the support chat ticket instead of navigating away
    function handleConnect(post: MatchedPost) {
        if (!post.owner_id || post.owner_id === "anonymous") return;

        // Open the support/chat flow in a new tab so user stays on this page
        const chatUrl = `/support/chat?to=${post.owner_id}`;
        window.open(chatUrl, "_blank", "noopener,noreferrer");
        setConnectMsg("Opening chat in a new tab… 💜");
        setTimeout(() => setConnectMsg(null), 3000);
    }

    return (
        <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] p-5">
            {/* Background glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-purple-400/20 to-indigo-400/20 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow">
                    <Users className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-extrabold text-gray-900 text-base">
                    People Feeling The Same Way
                </h3>
            </div>
            <p className="relative text-xs text-gray-600 mb-4 leading-relaxed pl-10">
                Describe how you&apos;re feeling. Our{" "}
                <span className="font-bold text-purple-700">AI</span> finds others
                experiencing the same — even with different words.
            </p>

            {/* Not logged in guard */}
            {!userId && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                        Please log in to use peer matching.
                    </p>
                </div>
            )}

            {/* Input */}
            <div className="relative">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g. I'm anxious about my upcoming exam and feeling overwhelmed…"
                    className="w-full text-sm rounded-2xl border border-purple-200 bg-white/80 backdrop-blur p-3 resize-none outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-gray-400 shadow-inner transition-all"
                    rows={3}
                    maxLength={500}
                    disabled={!userId}
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">
                    {inputText.length}/500
                </span>
            </div>

            {error && (
                <p className="mt-2 text-xs text-red-600 font-medium px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {error}
                </p>
            )}

            {connectMsg && (
                <p className="mt-2 text-xs text-purple-700 font-medium px-1">{connectMsg}</p>
            )}

            {/* CTA Button */}
            <button
                onClick={findMatches}
                disabled={loading || inputText.trim().length < 5 || !userId}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-sm font-bold shadow-[0_12px_40px_-16px_rgba(88,28,135,0.55)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                type="button"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Matching with AI…
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        Find My Match
                    </>
                )}
            </button>

            {/* ML Badge */}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                <Brain className="w-3 h-3 text-purple-400" />
                Powered by vector embeddings + cosine similarity
            </div>

            {/* Results */}
            {hasSearched && matches !== null && (
                <div className="mt-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-extrabold text-gray-800">
                            {matches.length === 0
                                ? "No matches found yet"
                                : `${matches.length} semantic match${matches.length > 1 ? "es" : ""} found`}
                        </span>
                        {matches.length > 0 && (
                            <span className="text-[10px] text-gray-500 font-medium">
                                Sorted by similarity
                            </span>
                        )}
                    </div>

                    {matches.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                            <p className="text-sm text-gray-600">No one has shared something similar yet. 🌱</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Share a mood post first — your post will help others find you.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {matches.map((post) => (
                                <MatchCard key={post.id} post={post} onConnect={handleConnect} />
                            ))}
                        </div>
                    )}

                    {/* Research info footer */}
                    <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                        <p className="text-[10px] text-purple-700 font-semibold flex items-center gap-1">
                            <Brain className="w-3 h-3" /> About this ML feature
                        </p>
                        <p className="text-[10px] text-purple-600 mt-0.5 leading-relaxed">
                            Matches are ranked using <b>cosine similarity</b> on{" "}
                            <b>768-dimensional sentence embeddings</b> (BAAI/bge-base-en-v1.5 via
                            HuggingFace). Posts below 65% threshold are filtered out. This is the
                            core ML contribution of the FeelUp research paper.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
