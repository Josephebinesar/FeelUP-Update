"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Flame, ArrowLeft, Globe, Users, Lock, Loader2 } from "lucide-react";

type Visibility = "public" | "followers" | "circle";

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="px-4 py-2 rounded-full bg-black text-white text-sm shadow-lg">{msg}</div>
    </div>
  );
}

export default function CreateChallengePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  /* ── CREATE ── */
  const create = async () => {
    const t = title.trim();
    if (!t) { setError("Title is required"); return; }
    if (!me) { setError("Not authenticated"); return; }

    if (startsOn && endsOn && new Date(endsOn) < new Date(startsOn)) {
      setError("End date must be after start date");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: description.trim() || null,
          starts_on: startsOn || null,
          ends_on: endsOn || null,
          visibility,
          owner_id: me.id,
        }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError(json?.error || "Failed to create challenge");
        return;
      }

      setToast("Challenge created ✅");
      setTimeout(() => router.push("/community/challenges"), 1200);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const visOptions: Array<{ value: Visibility; icon: React.ReactNode; label: string; desc: string }> = [
    { value: "public", icon: <Globe className="w-4 h-4 text-orange-600" />, label: "Public", desc: "Anyone can see & join" },
    { value: "followers", icon: <Users className="w-4 h-4 text-orange-600" />, label: "Followers", desc: "Your followers only" },
    { value: "circle", icon: <Lock className="w-4 h-4 text-orange-600" />, label: "Invite-only", desc: "Your circle members" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-amber-50 to-rose-100 text-gray-700">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-amber-50 to-rose-100 px-4 py-10">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-800 hover:underline mb-6"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Card */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-orange-400/40 via-rose-400/30 to-amber-400/40 blur-xl opacity-70" />
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] p-6 sm:p-8">

            {/* Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Create Challenge</h1>
                <p className="text-sm text-gray-600">Motivate others with a growth challenge</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Challenge title */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Challenge title <span className="text-red-500">*</span>
                </label>
                <input
                  id="challenge-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. No self-criticism week"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm placeholder:text-gray-400"
                  maxLength={120}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should participants do? Why does this challenge matter?"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm h-28 resize-none placeholder:text-gray-400"
                  maxLength={1000}
                />
              </div>

              {/* Dates */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Start date</label>
                  <input
                    type="date"
                    value={startsOn}
                    onChange={(e) => setStartsOn(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">End date</label>
                  <input
                    type="date"
                    value={endsOn}
                    onChange={(e) => setEndsOn(e.target.value)}
                    min={startsOn || undefined}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
                  />
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Visibility</label>
                <div className="grid grid-cols-3 gap-2">
                  {visOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      className={`rounded-2xl border px-3 py-3 text-left transition hover:bg-orange-50 ${
                        visibility === opt.value
                          ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                        {opt.icon} {opt.label}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => router.back()}
                  type="button"
                  className="rounded-2xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={create}
                  disabled={saving || !title.trim()}
                  type="button"
                  className="rounded-2xl py-3 font-semibold text-white bg-gradient-to-r from-orange-600 to-rose-600 shadow-[0_10px_30px_-10px_rgba(234,88,12,0.5)] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                  ) : (
                    "🔥 Create Challenge"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
