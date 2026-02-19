"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Sparkles, Lock, Users, Globe, ArrowLeft } from "lucide-react";

type Visibility = "public" | "followers" | "circle";

function safeMsg(err: any) {
  return (
    (typeof err?.message === "string" && err.message) ||
    (typeof err === "string" && err) ||
    "Unknown error"
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="px-4 py-2 rounded-full bg-black text-white text-sm shadow-lg">
        {msg}
      </div>
    </div>
  );
}

export default function CreateCirclePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("circle");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => setToast(m);

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

    const n = name.trim();
    const d = description.trim();

    if (!n) {
      showToast("Circle name is required");
      return;
    }

    setSaving(true);

    // Create circle
    const { data: circle, error } = await supabase
      .from("community_circles")
      .insert({
        name: n,
        description: d || null,
        visibility,
        owner_id: me.id,
      })
      .select()
      .single();

    if (error || !circle) {
      showToast(error?.message || "Failed to create circle");
      setSaving(false);
      return;
    }

    // Add owner as admin
    const { error: memberError } = await supabase.from("circle_members").insert({
      circle_id: circle.id,
      user_id: me.id,
      role: "admin",
    });

    if (memberError) {
      // if unique/duplicate, ignore
      const msg = safeMsg(memberError).toLowerCase();
      if (!(msg.includes("duplicate") || msg.includes("unique"))) {
        showToast("Circle created, but admin role failed: " + safeMsg(memberError));
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    showToast("Circle created ✅");
    router.push(`/community/circles/${circle.id}`);
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-pink-50 to-blue-100">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-pink-50 to-blue-100 px-4 py-10">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-800 hover:underline mb-6"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="relative">
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-purple-400/40 via-pink-400/30 to-blue-400/40 blur-xl opacity-70" />
          <div className="relative bg-white/70 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Create a Circle
                </h1>
                <p className="text-sm text-gray-700 mt-1">
                  Private spaces for trusted sharing — classmates, best friends, or study groups.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Circle name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Example: Final Year Study Squad"
                  className="w-full border border-white/70 bg-white/60 backdrop-blur rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this circle about?"
                  className="w-full border border-white/70 bg-white/60 backdrop-blur rounded-2xl px-4 py-3 h-28 outline-none focus:ring-2 focus:ring-purple-200 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Visibility
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisibility("circle")}
                    className={`rounded-2xl border px-4 py-3 text-left bg-white/60 backdrop-blur shadow-sm hover:bg-white transition ${
                      visibility === "circle"
                        ? "border-purple-400 ring-2 ring-purple-200"
                        : "border-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <Lock className="w-4 h-4 text-purple-700" /> Invite-only
                    </div>
                    <div className="text-xs text-gray-700 mt-1">
                      Best for trusted sharing
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("followers")}
                    className={`rounded-2xl border px-4 py-3 text-left bg-white/60 backdrop-blur shadow-sm hover:bg-white transition ${
                      visibility === "followers"
                        ? "border-purple-400 ring-2 ring-purple-200"
                        : "border-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <Users className="w-4 h-4 text-purple-700" /> Followers
                    </div>
                    <div className="text-xs text-gray-700 mt-1">
                      People who follow you
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`rounded-2xl border px-4 py-3 text-left bg-white/60 backdrop-blur shadow-sm hover:bg-white transition ${
                      visibility === "public"
                        ? "border-purple-400 ring-2 ring-purple-200"
                        : "border-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <Globe className="w-4 h-4 text-purple-700" /> Public
                    </div>
                    <div className="text-xs text-gray-700 mt-1">
                      Anyone can join
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => router.back()}
                  className="rounded-2xl border bg-white/60 backdrop-blur hover:bg-white py-3 font-semibold shadow-sm"
                  type="button"
                >
                  Cancel
                </button>

                <button
                  onClick={createCircle}
                  disabled={saving}
                  className="rounded-2xl py-3 font-semibold text-white bg-gradient-to-r from-purple-700 via-fuchsia-700 to-indigo-700 shadow-[0_16px_50px_-20px_rgba(88,28,135,0.6)] hover:brightness-110 disabled:opacity-50"
                  type="button"
                >
                  {saving ? "Creating…" : "Create Circle"}
                </button>
              </div>

              <div className="text-xs text-gray-700 pt-1">
                Tip: Invite-only circles feel safer and reduce spam ✅
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
