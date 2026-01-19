"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { BookOpen } from "lucide-react";

/* -------------------- CONSTANTS -------------------- */

const moodOptions = [
  { label: "Happy", emoji: "😊" },
  { label: "Calm", emoji: "😌" },
  { label: "Excited", emoji: "🤩" },
  { label: "Grateful", emoji: "🙏" },
  { label: "Motivated", emoji: "💪" },
  { label: "Sad", emoji: "😔" },
];

const energyLevels = [
  { value: 1, emoji: "😴" },
  { value: 2, emoji: "😔" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😊" },
  { value: 5, emoji: "🚀" },
];

/* -------------------- PAGE -------------------- */

export default function JournalPage() {
  const router = useRouter();

  // ✅ SAFE SINGLETON (DO NOT INLINE)
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [entries, setEntries] = useState<any[]>([]);
  const [gratitudeEntries, setGratitudeEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] =
    useState<"journal" | "gratitude">("journal");

  const [addingType, setAddingType] =
    useState<"journal" | "gratitude" | null>(null);

  const [selectedMood, setSelectedMood] = useState<any>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);

  /* -------------------- AUTH -------------------- */

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* -------------------- LOAD ENTRIES -------------------- */

  const loadEntries = useCallback(async () => {
    if (!user?.email) return;

    const res = await fetch(`/api/journal?user_email=${user.email}`);
    const data = await res.json();

    const all = data.entries || [];
    setEntries(all.filter((e: any) => !e.is_gratitude));
    setGratitudeEntries(all.filter((e: any) => e.is_gratitude));
  }, [user?.email]);

  useEffect(() => {
    if (user) loadEntries();
  }, [user, loadEntries]);

  /* -------------------- ADD ENTRY -------------------- */

  const addEntry = async (
    e: React.FormEvent<HTMLFormElement>,
    isGratitude: boolean
  ) => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: user.email,
        title: fd.get("title"),
        content: fd.get("content"),
        mood: selectedMood?.label ?? null,
        mood_emoji: selectedMood?.emoji ?? null,
        energy_level: energyLevel,
        is_gratitude: isGratitude,
      }),
    });

    setAddingType(null);
    setSelectedMood(null);
    setEnergyLevel(null);
    loadEntries();
  };

  /* -------------------- UI -------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading journal…
      </div>
    );
  }

  const visibleEntries =
    activeTab === "journal" ? entries : gratitudeEntries;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-7 h-7 text-purple-500" />
        <h1 className="text-3xl font-bold">Journal</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab("journal")}
          className={`px-4 py-2 rounded ${
            activeTab === "journal"
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          Journal
        </button>
        <button
          onClick={() => setActiveTab("gratitude")}
          className={`px-4 py-2 rounded ${
            activeTab === "gratitude"
              ? "bg-green-500 text-white"
              : "bg-gray-200"
          }`}
        >
          Gratitude
        </button>
      </div>

      {/* Add Entry */}
      {!addingType && (
        <button
          onClick={() => setAddingType(activeTab)}
          className="mb-6 px-4 py-2 bg-purple-500 text-white rounded"
        >
          + Add Entry
        </button>
      )}

      {/* Form */}
      {addingType && (
        <form
          onSubmit={(e) => addEntry(e, addingType === "gratitude")}
          className="bg-white p-6 rounded mb-6 space-y-3"
        >
          {addingType === "journal" && (
            <input
              name="title"
              placeholder="Title"
              className="w-full border p-2 rounded"
            />
          )}

          <textarea
            name="content"
            placeholder="Write here..."
            required
            className="w-full border p-2 rounded h-32"
          />

          {/* Mood */}
          <div className="flex gap-2 flex-wrap">
            {moodOptions.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setSelectedMood(m)}
                className={`px-3 py-1 rounded ${
                  selectedMood?.label === m.label
                    ? "bg-blue-200"
                    : "bg-gray-100"
                }`}
              >
                {m.emoji}
              </button>
            ))}
          </div>

          {/* Energy */}
          <div className="flex gap-2">
            {energyLevels.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setEnergyLevel(e.value)}
                className={`px-3 py-1 rounded ${
                  energyLevel === e.value
                    ? "bg-green-200"
                    : "bg-gray-100"
                }`}
              >
                {e.emoji}
              </button>
            ))}
          </div>

          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Save Entry
          </button>
        </form>
      )}

      {/* Entries */}
      {visibleEntries.map((e) => (
        <div key={e.id} className="bg-white p-4 rounded mb-4">
          <div className="text-sm text-gray-500">
            {new Date(e.created_at).toLocaleString()}
          </div>
          <p className="mt-2 whitespace-pre-wrap">{e.content}</p>
        </div>
      ))}
    </div>
  );
}
