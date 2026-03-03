"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { BookOpen, Heart } from "lucide-react";

/* -------------------- CONSTANTS -------------------- */

const moodOptions = [
  { label: "Happy", emoji: "😊" },
  { label: "Calm", emoji: "😌" },
  { label: "Excited", emoji: "🤩" },
  { label: "Grateful", emoji: "🙏" },
  { label: "Motivated", emoji: "💪" },
  { label: "Sad", emoji: "😔" },
  { label: "Anxious", emoji: "😰" },
];

const energyLevels = [
  { value: 1, emoji: "😴" },
  { value: 2, emoji: "😔" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😊" },
  { value: 5, emoji: "🚀" },
];

type Tab = "journal" | "gratitude";

const tabMeta: Record<Tab, { title: string; icon: any; color: string }> = {
  journal: { title: "Feel Journal", icon: BookOpen, color: "bg-blue-500" },
  gratitude: { title: "Gratitude Notes", icon: Heart, color: "bg-green-500" },
};

export default function JournalPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("journal");
  const [adding, setAdding] = useState(false);
  const [selectedMood, setSelectedMood] = useState<any>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  /* -------------------- AUTH -------------------- */

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    }
    init();
  }, [router, supabase]);

  /* -------------------- LOAD ITEMS -------------------- */

  const loadItems = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("journal_entries")
      .select(
        "id, entry_type, title, content, mood_tag, mood_emoji, energy_level, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD journal_entries error:", error);
      return;
    }

    setItems(data || []);
  }, [supabase, user?.id]);

  useEffect(() => {
    if (user) loadItems();
  }, [user, loadItems]);

  /* -------------------- ADD ITEM -------------------- */

  const addItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    setSaving(true);

    const fd = new FormData(e.currentTarget);

    const payload = {
      user_id: user.id,
      entry_type: activeTab,
      title: activeTab === "journal" ? fd.get("title") : null,
      content: fd.get("content"),
      mood_tag: selectedMood?.label ?? null,
      mood_emoji: selectedMood?.emoji ?? null,
      energy_level: energyLevel,
    };

    const { error } = await supabase.from("journal_entries").insert(payload);

    if (error) {
      alert(error.message);
      console.error("INSERT error:", error);
    } else {
      setAdding(false);
      setSelectedMood(null);
      setEnergyLevel(null);
      formRef.current?.reset();
      loadItems();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const visible = items.filter((x) => x.entry_type === activeTab);
  const TabIcon = tabMeta[activeTab].icon;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <TabIcon className="w-7 h-7 text-purple-600" />
        <h1 className="text-3xl font-bold">{tabMeta[activeTab].title}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {(["journal", "gratitude"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded ${
              activeTab === t ? `${tabMeta[t].color} text-white` : "bg-gray-200"
            }`}
          >
            {tabMeta[t].title}
          </button>
        ))}
      </div>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mb-6 px-4 py-2 bg-purple-500 text-white rounded"
        >
          + Add Entry
        </button>
      )}

      {adding && (
        <form
          ref={formRef}
          onSubmit={addItem}
          className="bg-white p-6 rounded mb-6 space-y-3"
        >
          {activeTab === "journal" && (
            <input
              name="title"
              placeholder="Title (optional)"
              className="w-full border p-2 rounded"
            />
          )}

          <textarea
            name="content"
            required
            placeholder={
              activeTab === "gratitude"
                ? "One thing I’m grateful for today…"
                : "Write your private note…"
            }
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
            {energyLevels.map((lvl) => (
              <button
                key={lvl.value}
                type="button"
                onClick={() => setEnergyLevel(lvl.value)}
                className={`px-3 py-1 rounded ${
                  energyLevel === lvl.value
                    ? "bg-green-200"
                    : "bg-gray-100"
                }`}
              >
                {lvl.emoji}
              </button>
            ))}
          </div>

          <button
            disabled={saving}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      {visible.length === 0 && (
        <div className="text-sm text-gray-400">No entries yet.</div>
      )}

      {visible.map((e) => (
        <div key={e.id} className="bg-white p-4 rounded mb-4">
          <div className="text-sm text-gray-500">
            {new Date(e.created_at).toLocaleString()}
          </div>

          {e.title && <h3 className="font-semibold mt-2">{e.title}</h3>}

          <p className="mt-2 whitespace-pre-wrap">{e.content}</p>

          <div className="text-sm text-gray-400 mt-2 flex gap-2">
            {e.mood_emoji && <span>{e.mood_emoji}</span>}
            {e.energy_level && <span>⚡{e.energy_level}/5</span>}
          </div>
        </div>
      ))}
    </div>
  );
}