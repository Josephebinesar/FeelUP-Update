"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  bio: string | null;
  privacy_level: string | null;
  theme: string | null;
};

export default function ProfilePage() {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      /* ---------- AUTH USER ---------- */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      /* ---------- FETCH PROFILE (SAFE) ---------- */
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(); // ✅ NEVER crashes

      if (error) {
        console.error("Profile fetch error:", error);
        setLoading(false);
        return;
      }

      /* ---------- CREATE PROFILE IF MISSING ---------- */
      if (!data) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
          });

        if (insertError) {
          console.error("Profile create error:", insertError);
          setLoading(false);
          return;
        }

        const { data: newProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(newProfile);
      } else {
        setProfile(data);
      }

      setLoading(false);
    };

    loadProfile();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="p-8 text-gray-500">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-red-500">
        Failed to load profile
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Email</label>
          <p className="text-gray-800">{profile.email}</p>
        </div>

        <div>
          <label className="text-sm text-gray-500">Full Name</label>
          <p className="text-gray-800">{profile.full_name || "—"}</p>
        </div>

        <div>
          <label className="text-sm text-gray-500">Bio</label>
          <p className="text-gray-800">{profile.bio || "—"}</p>
        </div>

        <div>
          <label className="text-sm text-gray-500">Privacy</label>
          <p className="text-gray-800">{profile.privacy_level || "public"}</p>
        </div>

        <button
          onClick={() => router.push("/profile/edit")}
          className="mt-4 px-5 py-2 rounded-lg bg-blue-500 text-white"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}
