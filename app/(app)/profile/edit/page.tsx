"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { ArrowLeft, Lock, Save } from "lucide-react";

export default function EditProfilePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.push("/login");
        return;
      }

      const res = await supabase
        .from("profiles")
        .select("id, full_name, username, bio, is_private")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (res.error) {
        alert(res.error.message);
        setLoading(false);
        return;
      }

      setProfile(res.data);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  async function save() {
    if (!profile) return;
    setSaving(true);

    const res = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        username: profile.username?.toLowerCase(),
        bio: profile.bio,
        is_private: !!profile.is_private,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setSaving(false);

    if (res.error) {
      alert(res.error.message);
      return;
    }

    router.push("/profile");
  }

  if (loading) return <div className="p-10 text-center text-gray-500">Loading…</div>;
  if (!profile) return <div className="p-10 text-center text-red-500">No profile found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100"
            type="button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Edit Profile</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
          <Field label="Full name">
            <input
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-200"
              value={profile.full_name || ""}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Your name"
            />
          </Field>

          <Field label="Username">
            <input
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-200"
              value={profile.username || ""}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="username"
            />
            <p className="text-xs text-gray-500 mt-1">Lowercase is recommended.</p>
          </Field>

          <Field label="Bio">
            <textarea
              className="w-full border rounded-xl px-4 py-3 h-28 focus:outline-none focus:ring-2 focus:ring-purple-200"
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell something about you…"
            />
          </Field>

          {/* Private toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Private account</p>
                <p className="text-xs text-gray-500">
                  People must request to follow you.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setProfile({ ...profile, is_private: !profile.is_private })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                profile.is_private ? "bg-purple-600 text-white" : "bg-white border"
              }`}
            >
              {profile.is_private ? "ON" : "OFF"}
            </button>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold"
            type="button"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
