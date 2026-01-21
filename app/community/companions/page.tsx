"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Search, Sparkles, MapPin, Users, ArrowLeft } from "lucide-react";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio?: string | null;
};

const TAGS = [
  "Study",
  "Gym",
  "Walking",
  "Beach",
  "Music",
  "Wellness",
  "Support",
  "Career",
];

export default function CompanionFinderPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

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
        .limit(50);

      if (cancelled) return;

      if (res.error) {
        console.error("Companion fetch error:", res.error);
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

    // For now, tag filter is simulated using bio keywords
    const matchesTag =
      !activeTag ||
      bio.includes(activeTag.toLowerCase()) ||
      name.includes(activeTag.toLowerCase());

    return matchesQuery && matchesTag;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading Companion Finder…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:underline"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-sm text-gray-600">
            Tip: put keywords like “study / gym / walking” in your bio for better matching
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-purple-900">
                Companion Finder 🧭
              </h1>
              <p className="text-sm text-gray-700 mt-1">
                Find a study partner, gym buddy, or someone for a beach walk.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="Search by name or bio…"
            />
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`text-xs px-3 py-1 rounded-full border ${
                !activeTag
                  ? "bg-purple-700 text-white border-purple-700"
                  : "bg-white hover:bg-gray-50"
              }`}
              type="button"
            >
              All
            </button>

            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  activeTag === t
                    ? "bg-purple-700 text-white border-purple-700"
                    : "bg-white hover:bg-gray-50"
                }`}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                Matches ({filtered.length})
              </div>
              {activeTag && (
                <div className="text-xs text-gray-500">
                  Filter: <b>{activeTag}</b>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border p-6 text-center text-gray-600">
                No matches found. Try different words or tags.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.slice(0, 20).map((u) => (
                  <div
                    key={u.id}
                    className="bg-white rounded-2xl border shadow-sm p-5 hover:shadow transition"
                  >
                    <div className="font-bold text-gray-900 truncate">
                      {u.full_name || u.username || "User"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {u.username ? `@${u.username}` : u.id}
                    </div>

                    {u.bio ? (
                      <p className="text-sm text-gray-700 mt-3 line-clamp-3">
                        {u.bio}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-3 italic">
                        No bio added
                      </p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => router.push(`/profile/${u.id}`)}
                        className="flex-1 px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm font-semibold"
                        type="button"
                      >
                        View Profile
                      </button>

                      <button
                        onClick={() => router.push(`/messages/${u.id}`)}
                        className="flex-1 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-sm font-semibold"
                        type="button"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 inline-flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Later we can add real matching using interests + location + goals.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
