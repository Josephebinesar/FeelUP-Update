"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

interface Profile {
  email: string;
  full_name: string | null;
  bio: string | null;
  privacy_level: string | null;
  theme: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.replace("/login");
      return;
    }

    const res = await fetch(
      `/api/profile?email=${encodeURIComponent(data.user.email!)}`,
    );

    const json = await res.json();
    setProfile(json.profile ?? null);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Profile not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>

        <p><b>Email:</b> {profile.email}</p>
        <p><b>Name:</b> {profile.full_name ?? "—"}</p>
        <p><b>Bio:</b> {profile.bio ?? "—"}</p>
        <p><b>Privacy:</b> {profile.privacy_level ?? "public"}</p>
        <p><b>Theme:</b> {profile.theme ?? "default"}</p>
      </div>
    </div>
  );
}