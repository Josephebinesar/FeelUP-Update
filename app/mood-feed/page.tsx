"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
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

/* ✅ Supportive reactions only */
const SUPPORTIVE_REACTIONS = [
  { key: "CHEER", label: "Cheer", emoji: "🎉" },
  { key: "SUPPORT", label: "Support", emoji: "💪" },
  { key: "HUG", label: "Hug", emoji: "🤗" },
  { key: "LOVE", label: "Love", emoji: "❤️" },
] as const;

type ReactionKey = (typeof SUPPORTIVE_REACTIONS)[number]["key"];
type Visibility = "public" | "followers" | "mutuals";

/** Your DB column */
const REACTION_COL = "reaction_type";

/** profiles FK name for mood_posts */
const PROFILES_FK_REL = "mood_posts_owner_id_fkey";

export default function MoodFeedPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  /* auth */
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* posts */
  const [posts, setPosts] = useState<any[]>([]);

  /* composer */
  const [composerOpen, setComposerOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<any>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [posting, setPosting] = useState(false);

  /* AI mood */
  const [detectingMood, setDetectingMood] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [moodReason, setMoodReason] = useState<string | null>(null);
  const [aiDetected, setAiDetected] = useState(false);

  /* image */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  /* comments & reactions */
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, any>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  /* ✅ SAVE */
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});

  /* ---------------- HELPERS ---------------- */

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

  const logErr = (label: string, err: any, extra?: any) => {
    const msg =
      (typeof err?.message === "string" && err.message) ||
      (typeof err === "string" && err) ||
      "Unknown error";
    const code =
      (typeof err?.code === "string" && err.code) ||
      (typeof err?.status === "number" ? String(err.status) : "");
    console.error(`${label} ${code ? `[${code}]` : ""} ${msg}`);
    if (extra !== undefined) console.error(`${label} extra:`, extra);
  };

  const pill = (text: string) => (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-gray-600 bg-gray-50">
      {text}
    </span>
  );

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;

      if (error) logErr("AUTH getUser error:", error);

      if (!data?.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* ---------------- AI MOOD DETECTION ---------------- */

  useEffect(() => {
    if (selectedMood) return;
    if (content.trim().length < 5) return;

    const timer = setTimeout(async () => {
      setDetectingMood(true);
      try {
        const res = await fetch("/api/detect-mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });

        const data = await res.json();
        const mood = moodOptions.find(
          (m) => m.label.toLowerCase() === data?.mood?.toLowerCase()
        );

        if (mood) {
          setSelectedMood(mood);
          setConfidence(data.confidence ?? null);
          setMoodReason(data.reason ?? null);
          setAiDetected(true);
        }
      } catch (e) {
        console.error("detect-mood error:", e);
      } finally {
        setDetectingMood(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [content, selectedMood]);

  /* ---------------- REACTIONS ---------------- */

  const loadReactions = useCallback(
    async (postId: string) => {
      if (!postId) return;

      const res = await supabase
        .from("post_reactions")
        .select(REACTION_COL)
        .eq("post_id", postId);

      if (res.error) {
        logErr("LOAD REACTIONS ERROR:", res.error, res);
        setReactionsMap((p) => ({ ...p, [postId]: p[postId] || {} }));
        return;
      }

      const counts: Record<string, number> = {
        CHEER: 0,
        SUPPORT: 0,
        HUG: 0,
        LOVE: 0,
      };

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

  /* ---------------- SAVED POSTS ---------------- */

  const loadSaved = useCallback(
    async (postIds: string[]) => {
      if (!user || postIds.length === 0) return;

      const res = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);

      if (res.error) {
        logErr("LOAD SAVED ERROR:", res.error, res);
        return;
      }

      const map: Record<string, boolean> = {};
      (res.data || []).forEach((row: any) => {
        map[row.post_id] = true;
      });
      setSavedMap(map);
    },
    [supabase, user]
  );

  const toggleSave = async (postId: string) => {
    if (!user) return;

    if (savedMap[postId]) {
      const del = await supabase
        .from("saved_posts")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (del.error) logErr("UNSAVE ERROR:", del.error, del);
    } else {
      const ins = await supabase.from("saved_posts").insert({
        user_id: user.id,
        post_id: postId,
      });

      if (ins.error) logErr("SAVE ERROR:", ins.error, ins);
    }

    loadSaved(posts.map((p) => p.id));
  };

  /* ---------------- SHARE ---------------- */

  const sharePost = async (postId: string) => {
    try {
      const url = `${window.location.origin}/post/${postId}`;
      await navigator.clipboard.writeText(url);
      alert("Link copied ✅");
    } catch {
      alert("Copy failed. Your browser blocked it.");
    }
  };

  /* ---------------- REPOST ---------------- */

  const repost = async (post: any) => {
    if (!user) return;

    const ins = await supabase.from("mood_posts").insert({
      content: post.content,
      mood: post.mood,
      mood_emoji: post.mood_emoji,
      mood_color: post.mood_color,
      image_url: post.image_url,
      anonymous: false,
      visibility: "public",
      owner_id: user.id,
      repost_of: post.id,
      ai_detected: false,
      ai_confidence: null,
      ai_reason: null,
    });

    if (ins.error) {
      alert(ins.error.message || "Failed to repost");
      logErr("REPOST ERROR:", ins.error, ins);
      return;
    }

    loadPosts();
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
        repost_of,
        ai_detected,
        ai_confidence,
        ai_reason,
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

    loadSaved(list.map((p: any) => p.id));
  }, [supabase, loadReactions, loadSaved]);

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
    setOpenComments((p) => ({ ...p, [postId]: !p[postId] }));
    if (!openComments[postId]) await loadComments(postId);
  };

  const addComment = async (postId: string) => {
    if (!user) return;
    const text = (newComment[postId] || "").trim();
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
    if (!selectedMood) return alert("Please select a mood");

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

      const postData: any = {
        content: content.trim() ? content.trim() : null,
        mood: selectedMood.label,
        mood_emoji: selectedMood.emoji,
        mood_color: selectedMood.color,
        anonymous,
        visibility,
        owner_id: user.id,
        image_url,
        ai_detected: aiDetected,
        ai_confidence: confidence,
        ai_reason: moodReason,
        repost_of: null,
      };

      const ins = await supabase.from("mood_posts").insert(postData);

      if (ins.error) {
        alert(ins.error.message || "Failed to share post");
        logErr("Post insert error:", ins.error, ins);
        return;
      }

      // reset
      setContent("");
      setSelectedMood(null);
      setConfidence(null);
      setMoodReason(null);
      setAiDetected(false);
      setAnonymous(false);
      setVisibility("public");
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      setComposerOpen(false);

      loadPosts();
    } finally {
      setPosting(false);
    }
  };

  /* ---------------- DELETE ---------------- */

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;

    const del = await supabase.from("mood_posts").delete().eq("id", postId);

    if (del.error) {
      alert("Failed to delete: " + del.error.message);
      logErr("DELETE POST ERROR:", del.error, del);
      return;
    }

    loadPosts();
  };

  /* ---------------- REALTIME ---------------- */

  useEffect(() => {
    const postsChannel = supabase
      .channel("realtime-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "mood_posts" }, () => loadPosts())
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
        if (postId && openComments[postId]) loadComments(postId);
      })
      .subscribe();

    const savedChannel = supabase
      .channel("realtime-saved")
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_posts" }, () => {
        loadSaved(posts.map((p: any) => p.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(savedChannel);
    };
  }, [supabase, loadPosts, loadReactions, loadComments, openComments, loadSaved, posts]);

  /* ---------------- UI ---------------- */

  if (loading) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          {/* Composer */}
          <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
            {!composerOpen ? (
              <button
                onClick={() => setComposerOpen(true)}
                className="w-full text-left text-gray-500 hover:text-gray-700"
              >
                Start a post…
              </button>
            ) : (
              <>
                <textarea
                  className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="How are you feeling? (optional)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />

                {detectingMood && (
                  <p className="text-xs text-gray-400 mt-2">🧠 Understanding mood…</p>
                )}

                {selectedMood && !detectingMood && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-sm">
                      {selectedMood.emoji} {selectedMood.label}
                    </span>
                    {confidence !== null && pill(`AI ${confidence}%`)}
                    {aiDetected && pill("Detected")}
                  </div>
                )}

                {moodReason && <p className="text-xs text-gray-400 italic mt-1">🧠 {moodReason}</p>}

                <div className="flex flex-wrap gap-2 mt-3">
                  {moodOptions.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => {
                        setSelectedMood(m);
                        setAiDetected(false);
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

                {/* Visibility */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Visibility</span>
                  <select
                    className="border rounded-lg px-3 py-1.5 text-sm bg-white"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                  >
                    <option value="public">Public</option>
                    <option value="followers">Friend circle (followers)</option>
                    <option value="mutuals">Close friends (mutuals)</option>
                  </select>

                  <label className="ml-auto text-sm text-gray-600 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />
                    Anonymous
                  </label>
                </div>

                {/* Image */}
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      className="rounded-2xl max-h-[420px] w-full object-cover border"
                      alt="preview"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="text-sm border px-3 py-2 rounded-xl hover:bg-gray-50"
                  >
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

                  <button
                    disabled={!selectedMood || posting}
                    onClick={submitPost}
                    className="bg-blue-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl"
                    type="button"
                  >
                    {posting ? "Posting..." : "Share ✨"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border p-4">
                {/* header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium text-gray-800">
                      {post.anonymous
                        ? "Anonymous"
                        : post.profiles?.full_name || post.profiles?.username || "User"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>{timeAgo(post.created_at)}</span>
                      <span>•</span>
                      <span>{humanVisibility(post.visibility)}</span>
                      {post.repost_of ? (
                        <>
                          <span>•</span>
                          <span className="text-purple-600">🔁 Reposted</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {post.owner_id === user?.id && (
                    <button
                      onClick={() => deletePost(post.id)}
                      className="text-xs text-red-600 hover:underline"
                      type="button"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* content */}
                <div className="mt-3 text-gray-900">
                  <div className="text-base">
                    <span className="mr-2">{post.mood_emoji}</span>
                    {post.content ? (
                      <span className="whitespace-pre-wrap">{post.content}</span>
                    ) : (
                      <span className="text-gray-400">(no text)</span>
                    )}
                  </div>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      className="mt-3 rounded-2xl max-h-[520px] w-full object-cover border"
                      alt="post"
                    />
                  )}

                  {/* AI analytics */}
                  {post.ai_detected && post.ai_confidence !== null && (
                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-2">
                      {pill(`🧠 AI ${post.ai_confidence}%`)}
                      {post.ai_reason ? <span className="italic">— {post.ai_reason}</span> : null}
                    </div>
                  )}
                </div>

                {/* actions row */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {/* reactions */}
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
                        <span className="text-gray-700">
                          {reactionsMap[post.id]?.[r.key] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    {/* save */}
                    <button
                      onClick={() => toggleSave(post.id)}
                      type="button"
                      className={`text-sm rounded-full px-3 py-1.5 border hover:bg-gray-50 ${
                        savedMap[post.id] ? "bg-yellow-50 border-yellow-200" : ""
                      }`}
                    >
                      {savedMap[post.id] ? "Saved ✅" : "Save"}
                    </button>

                    {/* share */}
                    <button
                      onClick={() => sharePost(post.id)}
                      type="button"
                      className="text-sm rounded-full px-3 py-1.5 border hover:bg-gray-50"
                    >
                      Share
                    </button>

                    {/* repost */}
                    <button
                      onClick={() => repost(post)}
                      type="button"
                      className="text-sm rounded-full px-3 py-1.5 border hover:bg-gray-50"
                    >
                      Repost
                    </button>
                  </div>
                </div>

                {/* comments */}
                <div className="mt-4">
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => toggleCommentsPanel(post.id)}
                    type="button"
                  >
                    💬 {openComments[post.id] ? "Hide comments" : "Comments"}
                  </button>

                  {openComments[post.id] && (
                    <div className="mt-3">
                      <div className="space-y-2">
                        {(comments[post.id] || []).map((c) => (
                          <div key={c.id} className="text-sm">
                            <span className="font-medium text-gray-800">
                              {c.profiles?.full_name || c.profiles?.username || "User"}
                            </span>
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
                        <button
                          onClick={() => addComment(post.id)}
                          className="text-sm bg-blue-600 text-white px-4 rounded-xl"
                          type="button"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <RightSidebar userEmail={user?.email} />
      </main>

      <Footer />
    </div>
  );
}
