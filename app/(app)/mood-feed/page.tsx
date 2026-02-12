"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import RightSidebar from "@/components/RightSidebar";
import Footer from "@/components/Footer";

/* ---------------- MOODS ---------------- */
const moodOptions = [
  { label: "Happy", emoji: "😊", color: "#fbbf24" },
  { label: "Calm", emoji: "😌", color: "#60a5fa" },
  { label: "Excited", emoji: "🤩", color: "#f472b6" },
  { label: "Grateful", emoji: "🙏", color: "#34d399" },
  { label: "Thoughtful", emoji: "🤔", color: "#a78bfa" },
  { label: "Sad", emoji: "😔", color: "#94a3b8" },
  { label: "Anxious", emoji: "😰", color: "#fb7185" },
  { label: "Tired", emoji: "😴", color: "#6b7280" },
];

/* Supportive reactions only */
const SUPPORTIVE_REACTIONS = [
  { key: "CHEER", label: "Cheer", emoji: "🎉" },
  { key: "SUPPORT", label: "Support", emoji: "💪" },
  { key: "HUG", label: "Hug", emoji: "🤗" },
  { key: "LOVE", label: "Love", emoji: "❤️" },
] as const;

type ReactionKey = (typeof SUPPORTIVE_REACTIONS)[number]["key"];
type Visibility = "public" | "followers" | "mutuals";

type ProfileLite = { full_name: string | null; username: string | null };

const REACTION_COL = "reaction_type";
const PROFILES_FK_REL = "mood_posts_owner_id_fkey";

function safeErrMsg(err: any) {
  return (
    (typeof err?.message === "string" && err.message) ||
    (typeof err === "string" && err) ||
    "Unknown error"
  );
}
function isMissingColumnError(msg: string) {
  return msg.toLowerCase().includes("does not exist") && msg.toLowerCase().includes("column");
}
function extractMissingColumn(msg: string): string | null {
  const m = msg.match(/column\s+"([^"]+)"/i);
  return m?.[1] ?? null;
}
function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function MoodFeedPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState<any[]>([]);

  // composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<any>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [posting, setPosting] = useState(false);

  // ✅ energy
  const [energyLevel, setEnergyLevel] = useState<number>(3);

  // ✅ AI suggestion (NOT auto-setting mood anymore)
  const [detectingMood, setDetectingMood] = useState(false);
  const [suggestedMood, setSuggestedMood] = useState<any>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [moodReason, setMoodReason] = useState<string | null>(null);

  // image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // comments + reactions
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, any>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // realtime refs
  const openCommentsRef = useRef<Record<string, boolean>>({});
  const postIdsRef = useRef<string[]>([]);

  useEffect(() => {
    openCommentsRef.current = openComments;
  }, [openComments]);

  useEffect(() => {
    postIdsRef.current = posts.map((p: any) => p.id).filter(Boolean);
  }, [posts]);

  const logErr = (label: string, err: any, extra?: any) => {
    const msg = safeErrMsg(err);
    const code =
      (typeof err?.code === "string" && err.code) ||
      (typeof err?.status === "number" ? String(err.status) : "");

    if (msg.toLowerCase().includes("auth session missing")) return;

    console.error(`${label} ${code ? `[${code}]` : ""} ${msg}`);
    if (extra !== undefined) console.error(`${label} extra:`, extra);
  };

  const pill = (text: string) => (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-gray-600 bg-gray-50">
      {text}
    </span>
  );

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const humanVisibility = (v?: string) => {
    if (v === "followers") return "Friend circle";
    if (v === "mutuals") return "Close friends";
    return "Public";
  };

  const timeOfDayInsight = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h <= 10) return "🌅 Good morning — what’s your plan for today?";
    if (h >= 11 && h <= 16) return "☀️ Midday check-in — how’s your day going so far?";
    if (h >= 17 && h <= 21) return "🌇 Evening — how did your day go?";
    return "🌙 Late night — how was your day? Be kind to yourself.";
  }, [composerOpen]);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const u = data.session?.user ?? null;
      if (!u) {
        router.replace("/login");
        return;
      }

      setUser(u);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* ---------------- AI MOOD SUGGESTION (Cleaner) ---------------- */
  useEffect(() => {
    // ✅ if user already picked a mood, no AI suggestion needed
    if (selectedMood) return;

    const txt = content.trim();
    if (txt.length < 8) {
      setSuggestedMood(null);
      setConfidence(null);
      setMoodReason(null);
      return;
    }
    if (posting) return;

    const timer = setTimeout(async () => {
      setDetectingMood(true);
      try {
        const res = await fetch("/api/detect-mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: txt }),
        });

        const data = await res.json();
        const mood = moodOptions.find((m) => m.label.toLowerCase() === String(data?.mood || "").toLowerCase());

        if (mood) {
          setSuggestedMood(mood);
          setConfidence(typeof data?.confidence === "number" ? data.confidence : null);
          setMoodReason(typeof data?.reason === "string" ? data.reason : null);
        } else {
          setSuggestedMood(null);
          setConfidence(null);
          setMoodReason(null);
        }
      } catch (e) {
        console.error("detect-mood error:", e);
      } finally {
        setDetectingMood(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [content, selectedMood, posting]);

  const useSuggestion = () => {
    if (!suggestedMood) return;
    setSelectedMood(suggestedMood);
    setSuggestedMood(null);
  };

  /* ---------------- REACTIONS ---------------- */
  const loadReactions = useCallback(
    async (postId: string) => {
      if (!postId) return;

      const res = await supabase.from("post_reactions").select(REACTION_COL).eq("post_id", postId);

      if (res.error) {
        logErr("LOAD REACTIONS ERROR:", res.error, res);
        setReactionsMap((p) => ({ ...p, [postId]: p[postId] || {} }));
        return;
      }

      const counts: Record<string, number> = { CHEER: 0, SUPPORT: 0, HUG: 0, LOVE: 0 };
      (res.data || []).forEach((r: any) => {
        const key = r?.[REACTION_COL] as string | undefined;
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });

      setReactionsMap((p) => ({ ...p, [postId]: counts }));
    },
    [supabase]
  );

  const toggleReaction = async (postId: string, reactionKey: ReactionKey) => {
    if (!user) return;

    const sel = await supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq(REACTION_COL, reactionKey)
      .maybeSingle();

    if (sel.error) {
      logErr("toggleReaction select error:", sel.error, sel);
      return;
    }

    if (sel.data?.id) {
      const del = await supabase.from("post_reactions").delete().eq("id", sel.data.id);
      if (del.error) logErr("toggleReaction delete error:", del.error, del);
    } else {
      const ins = await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionKey,
      });
      if (ins.error) logErr("toggleReaction insert error:", ins.error, ins);
    }

    loadReactions(postId);
  };

  /* ---------------- LOAD POSTS ---------------- */
  const loadPosts = useCallback(async () => {
    const res = await supabase
      .from("mood_posts")
      .select(
        `
        id,
        content,
        mood,
        mood_emoji,
        mood_color,
        image_url,
        anonymous,
        visibility,
        owner_id,
        created_at,
        ai_detected,
        ai_confidence,
        ai_reason,
        energy_level,
        profiles:profiles!${PROFILES_FK_REL} (
          full_name,
          username
        )
      `
      )
      .order("created_at", { ascending: false });

    if (res.error) {
      logErr("LOAD POSTS ERROR:", res.error, res);
      alert(`Failed to load posts: ${res.error.message || "Unknown error"}`);
      return;
    }

    const list = res.data || [];
    setPosts(list);

    list.forEach((p: any) => {
      if (p?.id) loadReactions(p.id);
    });
  }, [supabase, loadReactions]);

  useEffect(() => {
    if (user) loadPosts();
  }, [user, loadPosts]);

  /* ---------------- COMMENTS ---------------- */
  const loadComments = useCallback(
    async (postId: string) => {
      const res = await supabase
        .from("comments")
        .select("id, post_id, user_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at");

      if (res.error) {
        logErr("LOAD COMMENTS ERROR:", res.error, res);
        return;
      }

      const list = res.data || [];
      const userIds = Array.from(new Set(list.map((c: any) => c.user_id).filter(Boolean)));

      let profilesById: Record<string, any> = {};
      if (userIds.length > 0) {
        const profRes = await supabase.from("profiles").select("id, full_name, username").in("id", userIds);
        if (profRes.error) logErr("LOAD COMMENT PROFILES ERROR:", profRes.error, profRes);
        else profilesById = Object.fromEntries((profRes.data || []).map((p: any) => [p.id, p]));
      }

      const merged = list.map((c: any) => ({ ...c, profiles: profilesById[c.user_id] || null }));
      setComments((p) => ({ ...p, [postId]: merged }));
    },
    [supabase]
  );

  const toggleCommentsPanel = async (postId: string) => {
    const next = !openComments[postId];
    setOpenComments((p) => ({ ...p, [postId]: next }));
    if (next) await loadComments(postId);
  };

  const addComment = async (postId: string) => {
    if (!user) return;
    const text = (newComment[postId] ?? "").trim();
    if (!text) return;

    const res = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: text,
    });

    if (res.error) {
      alert(res.error.message || "Comment rejected.");
      logErr("ADD COMMENT ERROR:", res.error, res);
      return;
    }

    setNewComment((p) => ({ ...p, [postId]: "" }));
    loadComments(postId);
  };

  /* ---------------- CREATE POST ---------------- */
  const submitPost = async () => {
    if (!user) return alert("User not ready. Please refresh.");
    if (!selectedMood) return alert("Please select a mood (or use suggestion)");

    setPosting(true);

    try {
      let image_url: string | null = null;

      if (imageFile) {
        const path = `${user.id}/${Date.now()}_${imageFile.name}`;
        const up = await supabase.storage.from("mood-images").upload(path, imageFile, { upsert: false });

        if (up.error) {
          alert("Failed to upload image: " + up.error.message);
          logErr("Image upload error:", up.error, up);
          return;
        }

        image_url = supabase.storage.from("mood-images").getPublicUrl(up.data.path).data.publicUrl;
      }

      const basePayload: any = {
        content: content.trim() ? content.trim() : null,
        mood: selectedMood.label,
        mood_emoji: selectedMood.emoji,
        mood_color: selectedMood.color,
        anonymous,
        visibility,
        owner_id: user.id,
        image_url,
        ai_detected: false,
        ai_confidence: null,
        ai_reason: null,
        energy_level: energyLevel,
      };

      let payload = { ...basePayload };
      let ins = await supabase.from("mood_posts").insert(payload);

      while (ins.error) {
        const msg = safeErrMsg(ins.error);
        if (!isMissingColumnError(msg)) break;

        const missing = extractMissingColumn(msg);
        if (!missing || !(missing in payload)) break;

        delete payload[missing];
        ins = await supabase.from("mood_posts").insert(payload);
      }

      if (ins.error) {
        alert(ins.error.message || "Failed to share post");
        logErr("Post insert error:", ins.error, ins);
        return;
      }

      setContent("");
      setSelectedMood(null);
      setSuggestedMood(null);
      setConfidence(null);
      setMoodReason(null);
      setAnonymous(false);
      setVisibility("public");
      setImageFile(null);
      setEnergyLevel(3);

      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      setComposerOpen(false);

      loadPosts();
    } finally {
      setPosting(false);
    }
  };

  /* ---------------- REALTIME ---------------- */
  useEffect(() => {
    const postsChannel = supabase
      .channel("realtime-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "mood_posts" }, () => {
        loadPosts();
      })
      .subscribe();

    const reactionsChannel = supabase
      .channel("realtime-reactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_reactions" }, (payload) => {
        const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (postId) loadReactions(postId);
      })
      .subscribe();

    const commentsChannel = supabase
      .channel("realtime-comments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        const postId = (payload.new as any)?.post_id;
        if (postId && openCommentsRef.current[postId]) {
          loadComments(postId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [supabase, loadPosts, loadReactions, loadComments]);

  if (loading) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Composer */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            {!composerOpen ? (
              <button onClick={() => setComposerOpen(true)} className="w-full text-left text-gray-500 hover:text-gray-700" type="button">
                Start a post…
              </button>
            ) : (
              <>
                <div className="mb-3 text-sm text-gray-600">{timeOfDayInsight}</div>

                <textarea
                  className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="How are you feeling? (optional)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />

                {/* ✅ AI suggestion box */}
                {detectingMood ? (
                  <p className="text-xs text-gray-400 mt-2">🧠 Suggesting a mood…</p>
                ) : suggestedMood && !selectedMood ? (
                  <div className="mt-3 rounded-2xl border bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-gray-800">
                        Suggested:{" "}
                        <span className="font-semibold">
                          {suggestedMood.emoji} {suggestedMood.label}
                        </span>
                        {confidence !== null ? <span className="ml-2 text-xs text-gray-500">(AI {confidence}%)</span> : null}
                      </div>
                      <button
                        type="button"
                        onClick={useSuggestion}
                        className="text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Use suggestion
                      </button>
                    </div>
                    {moodReason ? <div className="mt-1 text-xs text-gray-500">🧠 {moodReason}</div> : null}
                  </div>
                ) : null}

                {/* Mood picker */}
                {selectedMood ? (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-sm">
                      {selectedMood.emoji} {selectedMood.label}
                    </span>
                    <button
                      type="button"
                      className="text-xs px-3 py-1.5 rounded-full border hover:bg-gray-50"
                      onClick={() => setSelectedMood(null)}
                    >
                      Change
                    </button>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-3">
                  {moodOptions.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => {
                        setSelectedMood(m);
                        setSuggestedMood(null);
                        setConfidence(null);
                        setMoodReason(null);
                      }}
                      className="px-3 py-1.5 rounded-full text-sm border bg-white hover:bg-gray-50"
                      type="button"
                    >
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>

                {/* Energy */}
                <div className="mt-4 bg-gray-50 border rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-800">Energy ⚡</div>
                    {pill(energyLevel <= 2 ? "Low" : energyLevel === 3 ? "Medium" : "High")}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-sm">😴</span>
                    <input type="range" min={1} max={5} value={energyLevel} onChange={(e) => setEnergyLevel(Number(e.target.value))} className="w-full" />
                    <span className="text-sm">🚀</span>
                  </div>
                </div>

                {/* Visibility + Anonymous */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Visibility</span>
                  <select className="border rounded-lg px-3 py-1.5 text-sm bg-white" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                    <option value="public">Public</option>
                    <option value="followers">Friend circle (followers)</option>
                    <option value="mutuals">Close friends (mutuals)</option>
                  </select>

                  <label className="ml-auto text-sm text-gray-600 flex items-center gap-2">
                    <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                    Anonymous
                  </label>
                </div>

                {/* Image */}
                {imagePreview && (
                  <div className="mt-4">
                    <img src={imagePreview} className="rounded-2xl max-h-[420px] w-full object-cover border" alt="preview" />
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 gap-2">
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="text-sm border px-3 py-2 rounded-xl hover:bg-gray-50">
                    Add Image
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

                  <button disabled={!selectedMood || posting} onClick={submitPost} className="bg-blue-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl" type="button">
                    {posting ? "Posting..." : "Share ✨"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {posts.map((post) => {
              const name = post.anonymous ? "Anonymous" : (post.profiles as ProfileLite | null)?.full_name || (post.profiles as ProfileLite | null)?.username || "User";

              return (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium text-gray-800">{name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{timeAgo(post.created_at)}</span>
                        <span>•</span>
                        <span>{humanVisibility(post.visibility)}</span>
                        {typeof post.energy_level === "number" ? (
                          <>
                            <span>•</span>
                            <span>⚡ {post.energy_level}/5</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-gray-900">
                    <div className="text-base">
                      <span className="mr-2">{post.mood_emoji}</span>
                      {post.content ? <span className="whitespace-pre-wrap">{post.content}</span> : <span className="text-gray-400">(no text)</span>}
                    </div>

                    {post.image_url && <img src={post.image_url} className="mt-3 rounded-2xl max-h-[520px] w-full object-cover border" alt="post" />}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {SUPPORTIVE_REACTIONS.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => toggleReaction(post.id, r.key)}
                          type="button"
                          className="text-sm border rounded-full px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"
                          title={r.label}
                        >
                          <span>{r.emoji}</span>
                          <span className="text-gray-700">{reactionsMap[post.id]?.[r.key] ?? 0}</span>
                        </button>
                      ))}
                    </div>

                    <div className="ml-auto">
                      <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleCommentsPanel(post.id)} type="button">
                        💬 {openComments[post.id] ? "Hide comments" : "Comments"}
                      </button>
                    </div>
                  </div>

                  {openComments[post.id] && (
                    <div className="mt-3">
                      <div className="space-y-2">
                        {(comments[post.id] || []).map((c) => (
                          <div key={c.id} className="text-sm">
                            <span className="font-medium text-gray-800">{c.profiles?.full_name || c.profiles?.username || "User"}</span>
                            <span className="text-gray-500"> · </span>
                            <span className="text-gray-700">{c.content}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <input
                          className="border rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          value={newComment[post.id] || ""}
                          onChange={(e) =>
                            setNewComment((p) => ({
                              ...p,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder="No links. Keep it supportive…"
                        />
                        <button onClick={() => addComment(post.id)} className="text-sm bg-blue-600 text-white px-4 rounded-xl" type="button">
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <RightSidebar userEmail={user?.email} />
      </main>

      <Footer />
    </div>
  );
}
