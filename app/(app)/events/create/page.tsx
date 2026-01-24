"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Upload, Lock, Globe, Users, Video } from "lucide-react";

type Visibility = "public" | "followers" | "circle";
type Circle = { id: string; name: string };

const CATEGORY_PRESETS = [
  "Wellness",
  "Study",
  "Gym",
  "Walking",
  "Beach",
  "Music",
  "Support",
] as const;

export default function CreateEventPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);

  const [maxAttendees, setMaxAttendees] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState("");
  const [price, setPrice] = useState<number | "">("");

  const [category, setCategory] = useState<string>(CATEGORY_PRESETS[0]);
  const [tagsText, setTagsText] = useState("");

  const [visibility, setVisibility] = useState<Visibility>("public");
  const [circles, setCircles] = useState<Circle[]>([]);
  const [circleId, setCircleId] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const logErr = (label: string, err: any) => console.error(label, err?.message || err);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;

      if (!uid) {
        router.push("/login");
        return;
      }

      if (!mounted) return;
      setUserId(uid);

      const c = await supabase
        .from("circles")
        .select("id,name")
        .order("created_at", { ascending: false });

      if (!c.error) setCircles((c.data || []) as Circle[]);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  async function createEvent() {
    if (!userId) return;
    if (!title.trim()) return alert("Title required");
    if (!eventDate) return alert("Date required");

    if (visibility === "circle" && !circleId) {
      return alert("Select a circle for circle visibility");
    }

    setLoading(true);

    try {
      let cover_image_url: string | null = null;

      if (coverFile) {
        const path = `${userId}/${Date.now()}_${coverFile.name}`;
        const up = await supabase.storage.from("event-images").upload(path, coverFile, { upsert: false });

        if (up.error) {
          alert("Cover upload failed: " + up.error.message);
          setLoading(false);
          return;
        }

        cover_image_url = supabase.storage.from("event-images").getPublicUrl(up.data.path).data.publicUrl;
      }

      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const ins = await supabase.from("events").insert({
        title,
        description: description.trim() || null,
        category,
        event_date: eventDate,
        event_time: eventTime || null,
        duration: duration.trim() || null,
        location: location.trim() || null,
        is_virtual: isVirtual,
        organizer: userId,
        attendees: 0,
        max_attendees: maxAttendees === "" ? null : maxAttendees,
        tags,
        difficulty: difficulty.trim() || null,
        price: price === "" ? null : price,
        visibility,
        circle_id: visibility === "circle" ? circleId : null,
        cover_image_url,
      });

      if (ins.error) {
        logErr("CREATE EVENT ERROR:", ins.error);
        alert(ins.error.message);
        return;
      }

      router.push("/events");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Create Event</h1>

        {/* Cover */}
        <div className="mb-5">
          <div className="text-sm font-semibold mb-2">Cover Image (optional)</div>

          {coverPreview ? (
            <img src={coverPreview} alt="cover" className="w-full h-44 object-cover rounded-xl mb-3" />
          ) : (
            <div className="w-full h-44 rounded-xl bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 mb-3" />
          )}

          <label className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            Upload cover
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setCoverFile(f);
                if (coverPreview) URL.revokeObjectURL(coverPreview);
                setCoverPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
        </div>

        <div className="space-y-4">
          <input
            className="w-full border px-3 py-2 rounded-lg"
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full border px-3 py-2 rounded-lg min-h-[120px]"
            placeholder="What is this event about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="date" className="border px-3 py-2 rounded-lg" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <input type="time" className="border px-3 py-2 rounded-lg" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border px-3 py-2 rounded-lg"
              placeholder="Duration (e.g. 45 mins)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded-lg"
              placeholder="Location (or Online link)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isVirtual} onChange={(e) => setIsVirtual(e.target.checked)} />
            <span className="inline-flex items-center gap-2">
              <Video className="w-4 h-4" /> Virtual event
            </span>
          </label>

          {/* Category */}
          <div>
            <div className="text-sm font-semibold mb-2">Category</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    category === c ? "bg-black text-white border-black" : ""
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="text-sm font-semibold mb-2">Tags (comma separated)</div>
            <input
              className="w-full border px-3 py-2 rounded-lg"
              placeholder="e.g. meditation, focus, accountability"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>

          {/* Difficulty / Price / Max */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border px-3 py-2 rounded-lg"
              placeholder="Difficulty (easy/medium/hard)"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded-lg"
              placeholder="Price (₹)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <input
              className="border px-3 py-2 rounded-lg"
              placeholder="Max attendees"
              type="number"
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          {/* Visibility */}
          <div>
            <div className="text-sm font-semibold mb-2">Visibility</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`px-3 py-2 rounded-lg border inline-flex items-center justify-center gap-2 ${
                  visibility === "public" ? "bg-black text-white border-black" : ""
                }`}
              >
                <Globe className="w-4 h-4" /> Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility("followers")}
                className={`px-3 py-2 rounded-lg border inline-flex items-center justify-center gap-2 ${
                  visibility === "followers" ? "bg-black text-white border-black" : ""
                }`}
              >
                <Users className="w-4 h-4" /> Followers
              </button>
              <button
                type="button"
                onClick={() => setVisibility("circle")}
                className={`px-3 py-2 rounded-lg border inline-flex items-center justify-center gap-2 ${
                  visibility === "circle" ? "bg-black text-white border-black" : ""
                }`}
              >
                <Lock className="w-4 h-4" /> Circle
              </button>
            </div>

            {visibility === "circle" && (
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-1">Choose circle</div>
                <select
                  className="w-full border px-3 py-2 rounded-lg"
                  value={circleId}
                  onChange={(e) => setCircleId(e.target.value)}
                >
                  <option value="">Select a circle…</option>
                  {circles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={createEvent}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            type="button"
          >
            {loading ? "Creating…" : "Create Event"}
          </button>
        </div>
      </div>
    </main>
  );
}
