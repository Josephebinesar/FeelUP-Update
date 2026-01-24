"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

const PROFILES_FK_REL = "mood_posts_owner_id_fkey";

export default function SavedClient() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const loadSaved = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;

    const res = await supabase
      .from("saved_posts")
      .select(
        `
        created_at,
        post:mood_posts (
          id,
          content,
          mood_emoji,
          created_at,
          owner_id,
          profiles:profiles!${PROFILES_FK_REL} ( full_name, username )
        )
      `
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (res.error) {
      console.error("loadSaved error:", res.error);
      setItems([]);
      return;
    }

    setItems(res.data || []);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
      await loadSaved();
    })();
  }, [router, supabase, loadSaved]);

  async function unsave(postId: string) {
    if (!user) return;
    const del = await supabase
      .from("saved_posts")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (del.error) {
      alert(del.error.message || "Failed to unsave");
      return;
    }

    await loadSaved();
  }

  if (loading) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <main className="max-w-3xl mx-auto p-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved</h1>
            <p className="text-sm text-gray-600">
              Posts you bookmarked to revisit later.
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold"
            type="button"
          >
            Back
          </button>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border p-10 text-center text-gray-600">
              No saved posts yet.
            </div>
          ) : (
            items.map((row: any, idx: number) => {
              const post = row.post;
              if (!post) return null;

              return (
                <div key={idx} className="bg-white rounded-2xl border p-4">
                  <div className="text-sm text-gray-700 font-medium">
                    {post.profiles?.full_name || post.profiles?.username || "User"}
                  </div>

                  <div className="mt-2 text-gray-900">
                    <span className="mr-2">{post.mood_emoji}</span>
                    {post.content ? (
                      post.content
                    ) : (
                      <span className="text-gray-400">(no text)</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="text-sm text-blue-600 hover:underline"
                      type="button"
                    >
                      Open
                    </button>

                    <button
                      onClick={() => unsave(post.id)}
                      className="text-sm text-red-600 hover:underline"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
