"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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

const reactions = ["🎉", "💪", "🤗", "❤️"];

/* ---------------- PAGE ---------------- */

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

  /* AI mood */
  const [detectingMood, setDetectingMood] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [moodReason, setMoodReason] = useState<string | null>(null);

  /* image */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  /* comments & reactions */
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, any>>({});

  /* ---------------- HELPERS ---------------- */

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
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
        }
      } catch (e) {
        console.error(e);
      } finally {
        setDetectingMood(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [content, selectedMood]);

  /* ---------------- LOAD POSTS ---------------- */

  /* ---------------- LOAD POSTS (FIXED) ---------------- */
  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("mood_posts")
      .select(`
      id,
      content,
      mood,
      mood_emoji,
      mood_color,
      image_url,
      anonymous,
      owner_id,
      created_at,
      profiles:profiles (
        full_name,
        username
      )
    `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD POSTS ERROR:", error);
      return;
    }

    setPosts(data || []);
    data?.forEach((p) => loadReactions(p.id));
  }, [supabase]);

  /* ---------------- REALTIME ---------------- */

  useEffect(() => {
    const commentsChannel = supabase
      .channel("realtime-comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const c = payload.new as any;
          setComments((p) => ({
            ...p,
            [c.post_id]: [...(p[c.post_id] || []), c],
          }));
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel("realtime-reactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_reactions" },
        (payload) => {
          const postId =
            payload.new?.post_id || payload.old?.post_id;
          if (postId) loadReactions(postId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [supabase]);

  /* ---------------- CREATE POST ---------------- */

  const submitPost = async () => {
    if (!content.trim() && !imageFile) return;

    let image_url: string | null = null;

    if (imageFile) {
      const path = `${user.id}/${Date.now()}_${imageFile.name}`;

      const { data, error } = await supabase.storage
        .from("mood-images")
        .upload(path, imageFile);

      if (!error && data) {
        image_url = supabase.storage
          .from("mood-images")
          .getPublicUrl(data.path).data.publicUrl;
      }
    }

    const { error: postError } = await supabase.from("mood_posts").insert({
      content,
      mood: selectedMood?.label,
      mood_emoji: selectedMood?.emoji,
      mood_color: selectedMood?.color,
      anonymous,
      owner_id: user.id,
      image_url,
    });

    if (postError) {
      alert("Failed to share post: " + postError.message);
      return;
    }

    setContent("");
    setSelectedMood(null);
    setConfidence(null);
    setMoodReason(null);
    setAnonymous(false);
    setImageFile(null);
    setImagePreview(null);
    setComposerOpen(false);
    loadPosts();
  };

  /* ---------------- REACTIONS ---------------- */

  const toggleReaction = async (postId: string, emoji: string) => {
    const { data } = await supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("emoji", emoji)
      .eq("user_id", user.id)
      .single();

    if (data) {
      await supabase.from("post_reactions").delete().eq("id", data.id);
    } else {
      await supabase.from("post_reactions").insert({
        post_id: postId,
        emoji,
        user_id: user.id,
      });
    }

    loadReactions(postId);
  };

  const loadReactions = async (postId: string) => {
    const { data } = await supabase
      .from("post_reactions")
      .select("emoji")
      .eq("post_id", postId);

    const counts: any = {};
    data?.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });

    setReactionsMap((p) => ({ ...p, [postId]: counts }));
  };

  /* ---------------- COMMENTS ---------------- */

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("comments")
      .select(`id, content, created_at, profiles ( full_name, username )`)
      .eq("post_id", postId)
      .order("created_at");

    setComments((p) => ({ ...p, [postId]: data || [] }));
  };

  const addComment = async (postId: string) => {
    if (!newComment[postId]) return;

    await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment[postId],
    });

    setNewComment((p) => ({ ...p, [postId]: "" }));
    loadComments(postId);
  };

  /* ---------------- DELETE ---------------- */

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("mood_posts").delete().eq("id", postId);
    loadPosts();
  };

  /* ---------------- UI ---------------- */

  if (loading) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>

          {/* COMPOSER */}
          <div className="bg-white rounded-xl p-4 mb-6">
            {!composerOpen ? (
              <div
                className="cursor-pointer text-gray-500"
                onClick={() => setComposerOpen(true)}
              >
                Start a post…
              </div>
            ) : (
              <>
                <textarea
                  className="w-full border rounded-lg p-3"
                  placeholder="How are you feeling?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />

                {detectingMood && (
                  <p className="text-sm text-gray-400 mt-1">
                    🧠 Understanding mood…
                  </p>
                )}

                {selectedMood && !detectingMood && (
                  <p className="text-sm mt-1">
                    {selectedMood.emoji} {selectedMood.label}
                    {confidence && (
                      <span className="text-xs ml-2">({confidence}%)</span>
                    )}
                  </p>
                )}

                {moodReason && (
                  <p className="text-xs text-gray-400 italic">🧠 {moodReason}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  {moodOptions.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => setSelectedMood(m)}
                      className="px-3 py-1 border rounded-full text-sm"
                    >
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>

                {imagePreview && (
                  <img src={imagePreview} className="mt-3 rounded-lg" />
                )}

                <div className="flex justify-between mt-3 items-center">
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />{" "}
                    Anonymous
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="text-sm border px-3 py-1 rounded"
                    >
                      Image
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
                          setImagePreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                    <button
                      disabled={!content.trim() && !imageFile}
                      onClick={submitPost}
                      className="bg-blue-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg"
                    >
                      Share ✨
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* POSTS */}
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-500">
                {post.anonymous
                  ? "Anonymous"
                  : post.profiles?.full_name ||
                  post.profiles?.username}{" "}
                · {timeAgo(post.created_at)}
              </div>

              <p className="mt-2">
                {post.mood_emoji} {post.content}
              </p>

              {post.image_url && (
                <img src={post.image_url} className="mt-3 rounded-lg" />
              )}

              <div className="flex gap-3 mt-2">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(post.id, emoji)}
                  >
                    {emoji} {reactionsMap[post.id]?.[emoji] || ""}
                  </button>
                ))}
              </div>

              {post.owner_id === user.id && (
                <button
                  onClick={() => deletePost(post.id)}
                  className="text-xs text-red-600 mt-2"
                >
                  Delete
                </button>
              )}

              <button
                className="text-sm text-blue-600 mt-2"
                onClick={() => loadComments(post.id)}
              >
                💬 Comments
              </button>

              {comments[post.id]?.map((c) => (
                <div key={c.id} className="text-sm mt-1">
                  <b>{c.profiles?.full_name}</b>: {c.content}
                </div>
              ))}

              <div className="flex gap-2 mt-2">
                <input
                  className="border rounded px-2 py-1 text-sm flex-1"
                  value={newComment[post.id] || ""}
                  onChange={(e) =>
                    setNewComment((p) => ({
                      ...p,
                      [post.id]: e.target.value,
                    }))
                  }
                  placeholder="Add comment"
                />
                <button
                  onClick={() => addComment(post.id)}
                  className="text-blue-600 text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>

        <RightSidebar userEmail={user.email} />
      </main>

      <Footer />
    </div>
  );
}
