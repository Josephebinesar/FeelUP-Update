"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PROFILES_FK_REL = "mood_posts_owner_id_fkey";

export default function PostClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }

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
        .eq("id", id)
        .maybeSingle();

      if (!mounted) return;

      if (res.error) {
        console.error("Load post error:", res.error);
        setPost(null);
      } else {
        setPost(res.data);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id, router, supabase]);

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (!post) return <div className="p-8 text-center">Post not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-sm text-gray-500">
            {post.anonymous
              ? "Anonymous"
              : post.profiles?.full_name || post.profiles?.username || "User"}
            <span className="mx-2">•</span>
            {new Date(post.created_at).toLocaleString()}
          </div>

          {post.repost_of && (
            <div className="text-xs text-purple-600 mt-1">🔁 Reposted</div>
          )}

          <p className="mt-3 text-lg">
            {post.mood_emoji}{" "}
            {post.content ? post.content : <span className="text-gray-400">(no text)</span>}
          </p>

          {post.image_url && (
            <img src={post.image_url} alt="post" className="mt-4 rounded-xl w-full" />
          )}

          {post.ai_detected && post.ai_confidence !== null && (
            <p className="text-xs text-gray-400 mt-2">
              🧠 AI confidence: {post.ai_confidence}%
              {post.ai_reason ? <span className="ml-2 italic">— {post.ai_reason}</span> : null}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
