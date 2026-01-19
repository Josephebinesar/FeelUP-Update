"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function EditProfilePage() {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, [supabase, router]);

  async function save() {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        username: profile.username?.toLowerCase(),
        bio: profile.bio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/profile");
  }

  if (loading) return null;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Edit Profile</h1>

      <input
        className="border p-2 w-full"
        value={profile.full_name || ""}
        onChange={(e) =>
          setProfile({ ...profile, full_name: e.target.value })
        }
        placeholder="Full name"
      />

      <input
        className="border p-2 w-full"
        value={profile.username || ""}
        onChange={(e) =>
          setProfile({ ...profile, username: e.target.value })
        }
        placeholder="Username"
      />

      <textarea
        className="border p-2 w-full"
        value={profile.bio || ""}
        onChange={(e) =>
          setProfile({ ...profile, bio: e.target.value })
        }
        placeholder="Bio"
      />

      <button
        onClick={save}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Save
      </button>
    </div>
  );
}
