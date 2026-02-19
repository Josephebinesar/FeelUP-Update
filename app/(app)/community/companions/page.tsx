"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Search, Sparkles, MapPin, Users, ArrowLeft, MessageCircle } from "lucide-react";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio?: string | null;
};

const TAGS = ["Study", "Gym", "Walking", "Beach", "Music", "Wellness", "Support", "Career"];

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="px-4 py-2 rounded-full bg-black text-white text-sm shadow-lg">
        {msg}
      </div>
    </div>
  );
}

function cx(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

export default function CompanionFinderPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => setToast(m);

  /* ---------- AUTH ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setMe(data.user);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* ---------- LOAD USERS ---------- */
  useEffect(() => {
    if (!me) return;

    let cancelled = false;

    (async () => {
      const res = await supabase
        .from("profiles")
        .select("id, username, full_name, bio")
        .order("created_at", { ascending: false })
        .limit(80);

      if (cancelled) return;

      if (res.error) {
        console.error("Companion fetch error:", res.error);
        showToast("Failed to load people");
        setUsers([]);
        return;
      }

      const list = (res.data || []).filter((p: any) => p.id !== me.id);
      setUsers(list);
    })();

    return () => {
      cancelled = true;
    };
  }, [me, supabase]);

  /* ---------- FILTER ---------- */
  const q = query.trim().toLowerCase();

  const filtered = users.filter((u) => {
    const name = (u.full_name || u.username || "").toLowerCase();
    const bio = (u.bio || "").toLowerCase();

    const matchesQuery = !q || name.includes(q) || bio.includes(q);

    const matchesTag =
      !activeTag ||
      bio.includes(activeTag.toLowerCase()) ||
      name.includes(activeTag.toLowerCase());

    return matchesQuery && matchesTag;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-pink-50 to-blue-100">
        Loading Companion Finder…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-pink-50 to-blue-100 px-4 py-10">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-800 hover:underline"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-xs text-gray-700">
            Tip: Put keywords like “study / gym / walking” in your bio
          </div>
        </div>

        {/* Glass card */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-purple-400/40 via-pink-400/30 to-blue-400/40 blur-xl opacity-70" />
          <div className="relative bg-white/70 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-purple-950">
                  Companion Finder 🧭
                </h1>
                <p className="text-sm text-gray-800 mt-1">
                  Find a study partner, gym buddy, or someone for a beach walk.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="mt-6 relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/70 bg-white/60 backdrop-blur outline-none focus:ring-2 focus:ring-purple-200 shadow-sm"
                placeholder="Search by name or bio…"
              />
            </div>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={cx(
                  "text-xs px-3 py-1.5 rounded-full border shadow-sm transition",
                  !activeTag
                    ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white border-transparent"
                    : "bg-white/60 backdrop-blur border-white/70 hover:bg-white"
                )}
                type="button"
              >
                All
              </button>

              {TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(t)}
                  className={cx(
                    "text-xs px-3 py-1.5 rounded-full border shadow-sm transition",
                    activeTag === t
                      ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white border-transparent"
                      : "bg-white/60 backdrop-blur border-white/70 hover:bg-white"
                  )}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="mt-7">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-extrabold text-gray-900 inline-flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Matches ({filtered.length})
                </div>
                {activeTag && (
                  <div className="text-xs text-gray-700">
                    Filter: <b>{activeTag}</b>
                  </div>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="bg-white/60 backdrop-blur rounded-2xl border border-white/70 p-8 text-center text-gray-800 shadow-sm">
                  No matches found. Try different words or tags.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.slice(0, 24).map((u) => (
                    <div
                      key={u.id}
                      className={cx(
                        "group relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 backdrop-blur",
                        "shadow-[0_18px_55px_-30px_rgba(0,0,0,0.45)]",
                        "transition-transform duration-300 hover:-translate-y-1"
                      )}
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-400/20 blur-2xl" />
                        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-400/20 blur-2xl" />
                      </div>

                      <div className="relative p-5">
                        <div className="font-extrabold text-gray-900 truncate">
                          {u.full_name || u.username || "User"}
                        </div>
                        <div className="text-xs text-gray-700 mt-1">
                          {u.username ? `@${u.username}` : "—"}
                        </div>

                        {u.bio ? (
                          <p className="text-sm text-gray-800 mt-3 line-clamp-3">
                            {u.bio}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 mt-3 italic">
                            No bio added
                          </p>
                        )}

                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => router.push(`/profile/${u.id}`)}
                            className="px-4 py-2 rounded-2xl border bg-white/70 hover:bg-white text-sm font-bold shadow-sm"
                            type="button"
                          >
                            View
                          </button>

                          <button
                            onClick={() => router.push(`/messages/${u.id}`)}
                            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-sm font-bold shadow-[0_16px_50px_-25px_rgba(88,28,135,0.6)] hover:brightness-110 inline-flex items-center justify-center gap-2"
                            type="button"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Message
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 text-xs text-gray-700 inline-flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Later we can add real matching using interests + location + goals.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
