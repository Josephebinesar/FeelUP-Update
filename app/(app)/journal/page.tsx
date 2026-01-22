"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { BookOpen, Image as ImageIcon, Heart, Send } from "lucide-react";

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

type Tab = "journal" | "gratitude" | "mood_board";

const tabMeta: Record<Tab, { title: string; icon: any; color: string }> = {
  journal: { title: "Feel Journal", icon: BookOpen, color: "bg-blue-500" },
  gratitude: { title: "Gratitude Notes", icon: Heart, color: "bg-green-500" },
  mood_board: { title: "Mood Board", icon: ImageIcon, color: "bg-purple-500" },
};

/* -------------------- PAGE -------------------- */

export default function JournalPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<Tab>("journal");
  const [adding, setAdding] = useState(false);

  const [items, setItems] = useState<any[]>([]);

  // mood tag + energy
  const [selectedMood, setSelectedMood] = useState<any>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);

  // mood board image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const logErr = (label: string, err: any) => {
    const msg =
      (typeof err?.message === "string" && err.message) ||
      (typeof err === "string" && err) ||
      "Unknown error";
    const code =
      (typeof err?.code === "string" && err.code) ||
      (typeof err?.status === "number" ? String(err.status) : "");
    console.error(`${label} ${code ? `[${code}]` : ""} ${msg}`);
  };

  /* -------------------- AUTH -------------------- */

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) logErr("AUTH getUser error:", error);

      if (!data?.user) {
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

  /* -------------------- LOAD ITEMS -------------------- */

  const loadItems = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("journal_entries")
      .select(
        "id, user_id, entry_type, title, content, mood, mood_emoji, energy_level, image_url, converted_to_post, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logErr("LOAD journal_entries error:", error);
      return;
    }

    setItems(data || []);
  }, [supabase, user?.id]);

  useEffect(() => {
    if (user) loadItems();
  }, [user, loadItems]);

  /* -------------------- REALTIME -------------------- */

  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel("realtime-journal")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journal_entries" },
        () => loadItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, user?.id, loadItems]);

  /* -------------------- ADD ITEM -------------------- */

  const addItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;
    if (saving) return;

    setSaving(true);

    try {
      const fd = new FormData(e.currentTarget);

      let image_url: string | null = null;

      // mood_board supports images
      if (activeTab === "mood_board" && imageFile) {
        const path = `${user.id}/${Date.now()}_${imageFile.name}`;
        const up = await supabase.storage
          .from("mood-images")
          .upload(path, imageFile, { upsert: false });

        if (up.error) {
          alert("Image upload failed: " + up.error.message);
          logErr("Mood board upload error:", up.error);
          return;
        }

        image_url = supabase.storage
          .from("mood-images")
          .getPublicUrl(up.data.path).data.publicUrl;
      }

      const payload: any = {
        user_id: user.id,
        entry_type: activeTab,
        title: activeTab === "journal" ? fd.get("title") : null,
        content: fd.get("content"),
        mood: selectedMood?.label ?? null,
        mood_emoji: selectedMood?.emoji ?? null,
        energy_level: energyLevel,
        image_url,
      };

      const { error } = await supabase.from("journal_entries").insert(payload);
      if (error) {
        alert(error.message || "Failed to save");
        logErr("INSERT journal_entries error:", error);
        return;
      }

      // reset UI
      setAdding(false);
      setSelectedMood(null);
      setEnergyLevel(null);
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      formRef.current?.reset();

      loadItems();
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- CONVERT TO POST -------------------- */

  const convertToPost = async (entry: any) => {
    if (!user?.id) return;

    const content = entry.content?.trim();
    if (!content) {
      alert("Nothing to post.");
      return;
    }

    const { error } = await supabase.from("mood_posts").insert({
      owner_id: user.id,
      content,
      mood: entry.mood ?? "Thoughtful",
      mood_emoji: entry.mood_emoji ?? "🤔",
      mood_color: "#a78bfa",
      image_url: entry.image_url ?? null,
      anonymous: false,
      visibility: "public",
      ai_detected: false,
      ai_confidence: null,
      ai_reason: null,
      repost_of: null,
    });

    if (error) {
      alert(error.message || "Failed to convert to post");
      logErr("convertToPost insert error:", error);
      return;
    }

    // mark converted
    const upd = await supabase
      .from("journal_entries")
      .update({ converted_to_post: true })
      .eq("id", entry.id);

    if (upd.error) logErr("mark converted error:", upd.error);

    alert("Posted to Mood Feed ✅");
    loadItems();
  };

  /* -------------------- UI -------------------- */

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
        {(["journal", "gratitude", "mood_board"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTab(t);
              setAdding(false);
            }}
            className={`px-4 py-2 rounded ${
              activeTab === t ? `${tabMeta[t].color} text-white` : "bg-gray-200"
            }`}
          >
            {tabMeta[t].title}
          </button>
        ))}
      </div>

      {/* Optional Reminder note */}
      {activeTab === "gratitude" && (
        <div className="bg-white border rounded p-4 mb-6 text-sm text-gray-600">
          💌 Tip: write <b>one thing</b> per day you’re grateful for. (We can add
          reminders later using notifications.)
        </div>
      )}

      {/* Add */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mb-6 px-4 py-2 bg-purple-500 text-white rounded"
        >
          + Add {activeTab === "mood_board" ? "Mood Card" : "Entry"}
        </button>
      )}

      {/* Form */}
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
            placeholder={
              activeTab === "gratitude"
                ? "One thing I’m grateful for today…"
                : activeTab === "mood_board"
                ? "Quote / feeling / note…"
                : "Write your private note…"
            }
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
                  selectedMood?.label === m.label ? "bg-blue-200" : "bg-gray-100"
                }`}
                title={m.label}
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
                  energyLevel === lvl.value ? "bg-green-200" : "bg-gray-100"
                }`}
                title={`Energy ${lvl.value}`}
              >
                {lvl.emoji}
              </button>
            ))}
          </div>

          {/* Mood Board image */}
          {activeTab === "mood_board" && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="text-sm border px-3 py-2 rounded"
              >
                Add Image (optional)
              </button>

              <input
                ref={imageInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImagePreview(URL.createObjectURL(f));
                  }
                }}
              />
            </div>
          )}

          {imagePreview && (
            <img src={imagePreview} className="rounded-lg max-h-64" alt="preview" />
          )}

          <div className="flex gap-2">
            <button
              disabled={saving}
              className="bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setSelectedMood(null);
                setEnergyLevel(null);
                setImageFile(null);
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImagePreview(null);
              }}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Items */}
      {visible.length === 0 && (
        <div className="text-sm text-gray-400">No entries yet.</div>
      )}

      {visible.map((e) => (
        <div key={e.id} className="bg-white p-4 rounded mb-4">
          <div className="text-sm text-gray-500 flex items-center justify-between">
            <span>{new Date(e.created_at).toLocaleString()}</span>
            <span className="text-xs text-gray-400 flex gap-2 items-center">
              {e.mood_emoji ? <span title={e.mood}>{e.mood_emoji}</span> : null}
              {e.energy_level ? <span>⚡{e.energy_level}/5</span> : null}
            </span>
          </div>

          {e.title ? <h3 className="font-semibold mt-2">{e.title}</h3> : null}

          {e.image_url ? (
            <img src={e.image_url} className="mt-3 rounded-lg" alt="mood" />
          ) : null}

          <p className="mt-2 whitespace-pre-wrap">{e.content}</p>

          {/* Convert note into post */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => convertToPost(e)}
              disabled={e.converted_to_post}
              className="text-xs border px-3 py-1 rounded flex items-center gap-1 disabled:opacity-50"
              type="button"
              title="Convert into a public mood post"
            >
              <Send className="w-3 h-3" />
              {e.converted_to_post ? "Posted ✅" : "Post to Mood Feed"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
