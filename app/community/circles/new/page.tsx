// app/community/circles/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Visibility = "public" | "followers" | "circle";

export default function CreateCirclePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("circle");
  const [saving, setSaving] = useState(false);

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setMe(data.user);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /* ---------------- CREATE CIRCLE ---------------- */

  const createCircle = async () => {
    if (!me) return;
    if (!name.trim()) {
      alert("Circle name is required");
      return;
    }

    setSaving(true);

    /* 1️⃣ Create circle */
    const { data: circle, error } = await supabase
      .from("community_circles")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        visibility,
        owner_id: me.id,
      })
      .select()
      .single();

    if (error || !circle) {
      alert(error?.message || "Failed to create circle");
      setSaving(false);
      return;
    }

    /* 2️⃣ ADD OWNER AS ADMIN (IMPORTANT PART) */
    const { error: memberError } = await supabase
      .from("circle_members")
      .insert({
        circle_id: circle.id,
        user_id: me.id,
        role: "admin", // ✅ THIS IS THE KEY
      });

    if (memberError) {
      alert("Circle created, but failed to add admin role");
      console.error(memberError);
      setSaving(false);
      return;
    }

    setSaving(false);

    /* 3️⃣ Go to circle page */
    router.push(`/community/circles/${circle.id}`);
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Create a Circle 🔒
        </h1>

        <p className="text-sm text-gray-600">
          Circles are private spaces for trusted sharing.
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Circle name"
          className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-200"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this circle about?"
          className="w-full border rounded-xl px-3 py-2 h-24 focus:ring-2 focus:ring-purple-200"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="w-full border rounded-xl px-3 py-2"
          >
            <option value="circle">🔒 Invite only (recommended)</option>
            <option value="followers">👥 Followers</option>
            <option value="public">🌍 Public</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 border rounded-xl py-2 hover:bg-gray-50"
            type="button"
          >
            Cancel
          </button>

          <button
            onClick={createCircle}
            disabled={saving}
            className="flex-1 bg-purple-700 text-white rounded-xl py-2 hover:bg-purple-800 disabled:opacity-50"
            type="button"
          >
            {saving ? "Creating…" : "Create Circle"}
          </button>
        </div>
      </div>
    </div>
  );
}
