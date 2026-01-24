"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  ShieldCheck,
  Sparkles,
  Flame,
  HeartHandshake,
  Lock,
  ArrowLeft,
} from "lucide-react";

function routeByEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "/admin";
  if (e.endsWith("@psychologist.feelup")) return "/psychologist";
  return "/mood-feed";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const em = email.trim();
    const pw = password;

    if (!em || !pw) {
      setErr("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });

      if (error) {
        setErr(error.message || "Login failed.");
        return;
      }

      const to = routeByEmail(data.user?.email);
      router.replace(to);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-white shadow flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-700" />
            </div>
            <span className="text-xl font-extrabold text-purple-900">FeelUp</span>
          </div>

          <div className="w-[60px]" />
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* LEFT: Brand panel */}
          <div className="relative overflow-hidden rounded-3xl border bg-white/70 backdrop-blur shadow-sm p-8">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-200/60 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-pink-200/60 rounded-full blur-3xl" />

            <div className="relative">
              <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
                Welcome back 👋
              </h1>
              <p className="mt-3 text-gray-700 text-lg">
                Sign in to continue your wellness journey — moods, circles, and
                growth in one place.
              </p>

              {/* Feature cards */}
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <Feature
                  icon={<HeartHandshake className="w-5 h-5" />}
                  title="Track moods & gratitude"
                  text="Capture emotions, reflect weekly, and spot patterns."
                />
                <Feature
                  icon={<ShieldCheck className="w-5 h-5" />}
                  title="Privacy-first sharing"
                  text="Public, followers, or circle-only — you control visibility."
                />
                <Feature
                  icon={<Sparkles className="w-5 h-5" />}
                  title="AI insights"
                  text="Gentle weekly recap + reflections without judgment."
                />
                <Feature
                  icon={<Flame className="w-5 h-5" />}
                  title="Challenges"
                  text="Small growth steps with community motivation."
                />
              </div>

              {/* Chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                <Chip icon={<Lock className="w-3.5 h-3.5" />} label="Safe spaces" />
                <Chip icon={<Sparkles className="w-3.5 h-3.5" />} label="AI insights" />
                <Chip icon={<Flame className="w-3.5 h-3.5" />} label="Challenges" />
              </div>

              {/* Role hint (hidden style, but useful for you) */}
              <div className="mt-6 text-xs text-gray-500">
                Admin: <b>@admin.feelup</b> · Psychologist: <b>@psychologist.feelup</b>
              </div>

              <div className="mt-8 text-sm text-gray-600">
                Don’t have an account?{" "}
                <button
                  onClick={() => router.push("/")}
                  className="font-semibold text-purple-700 hover:underline"
                  type="button"
                >
                  Create Account →
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Login card */}
          <div className="rounded-3xl bg-white shadow-xl border p-8">
            <div className="text-center mb-7">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Welcome back to FeelUp
              </h2>
              <p className="text-gray-600 mt-2">Continue where you left off.</p>
            </div>

            {/* ✅ Login form (replaces ClientAuthCard) */}
            {err ? (
              <div className="mb-4 text-sm rounded-2xl border border-red-200 bg-red-50 text-red-700 p-3">
                {err}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Password
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-purple-700 text-white py-3 text-sm font-semibold hover:bg-purple-800 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row gap-3 items-center justify-between text-sm text-gray-500">
              <div className="flex gap-5">
                <a href="/privacy" className="hover:text-purple-700">
                  Privacy Policy
                </a>
                <a href="/terms" className="hover:text-purple-700">
                  Terms of Service
                </a>
              </div>

              <a href="mailto:support@feelup.com" className="hover:text-purple-700">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI Bits ---------- */

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border bg-white/80 p-4 shadow-sm hover:shadow transition">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-purple-50 border flex items-center justify-center text-purple-700">
          {icon}
        </div>
        <div className="font-semibold text-gray-900">{title}</div>
      </div>
      <p className="mt-2 text-sm text-gray-600">{text}</p>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/80 text-sm text-gray-700">
      <span className="text-purple-700">{icon}</span>
      {label}
    </span>
  );
}
