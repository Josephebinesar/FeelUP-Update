"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  Flame,
  Plus,
  Search,
  ArrowLeft,
  CalendarDays,
  Users,
  Sparkles,
  ChevronRight,
} from "lucide-react";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  visibility: string;
  created_at: string;
  participants_count?: number;
};

function cx(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm shadow-xl">{msg}</div>
    </div>
  );
}

export default function ChallengesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => setToast(m);

  /* ── AUTH ── */
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) { router.replace("/login"); return; }
      setMe(data.user);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [router, supabase]);

  /* ── LOAD ── */
  const loadChallenges = useCallback(async () => {
    const res = await supabase
      .from("challenges")
      .select("id, title, description, starts_on, ends_on, visibility, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (res.error) {
      showToast("Failed to load challenges: " + res.error.message);
      return;
    }
    setChallenges((res.data as any) || []);
  }, [supabase]);

  useEffect(() => {
    if (!me) return;
    loadChallenges();
  }, [me, loadChallenges]);

  /* ── REALTIME ── */
  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel("challenges-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => loadChallenges())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me, supabase, loadChallenges]);

  /* ── FILTER ── */
  const q = query.trim().toLowerCase();
  const filtered = challenges.filter((c) => {
    if (!q) return true;
    return (c.title || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-amber-50 to-rose-100 flex items-center justify-center text-gray-700">
        Loading challenges…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-amber-50 to-rose-100">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Back */}
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-800 hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Community
        </Link>

        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white shadow flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-orange-950">Challenges</h1>
            </div>
            <p className="text-gray-700 max-w-xl">
              Weekly &amp; monthly growth challenges for gentle accountability — join or{" "}
              <b>create your own</b>.
            </p>
          </div>

          <Link
            href="/community/challenges/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-rose-600 text-white text-sm font-bold shadow-[0_16px_50px_-25px_rgba(234,88,12,0.6)] hover:brightness-110 shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Challenge
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search challenges…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/70 bg-white/80 backdrop-blur outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl bg-white shadow mx-auto flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-orange-400" />
            </div>
            <div className="text-xl font-extrabold text-gray-900 mb-2">No challenges yet</div>
            <p className="text-gray-600 mb-6">
              {query ? "Try a different search." : "Be the first to create a challenge!"}
            </p>
            {!query && (
              <Link
                href="/community/challenges/new"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-rose-600 text-white text-sm font-bold shadow-[0_16px_50px_-25px_rgba(234,88,12,0.6)] hover:brightness-110"
              >
                <Plus className="w-4 h-4" /> Create the first challenge
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const vis = challenge.visibility;
  const active =
    challenge.starts_on && challenge.ends_on
      ? new Date() >= new Date(challenge.starts_on) && new Date() <= new Date(challenge.ends_on)
      : null;

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_15px_50px_-20px_rgba(0,0,0,0.2)] p-5 transition-transform duration-300 hover:-translate-y-1">
      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-orange-300/20 blur-2xl" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-rose-300/20 blur-2xl" />
      </div>

      <div className="relative">
        {/* Title + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-extrabold text-gray-900 leading-tight">{challenge.title}</h3>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {active !== null && (
              <span
                className={cx(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                  active
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                )}
              >
                {active ? "🟢 Active" : "Upcoming"}
              </span>
            )}
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-orange-50 text-orange-800 border-orange-200 font-medium capitalize">
              {vis}
            </span>
          </div>
        </div>

        {/* Description */}
        {challenge.description && (
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">{challenge.description}</p>
        )}

        {/* Dates */}
        {(challenge.starts_on || challenge.ends_on) && (
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <CalendarDays className="w-3.5 h-3.5" />
            {challenge.starts_on && <span>{fmtDate(challenge.starts_on)}</span>}
            {challenge.starts_on && challenge.ends_on && <span>→</span>}
            {challenge.ends_on && <span>{fmtDate(challenge.ends_on)}</span>}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span>Created {fmtDate(challenge.created_at)}</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
