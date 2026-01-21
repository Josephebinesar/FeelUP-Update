"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { ArrowRight, User } from "lucide-react";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  is_private: boolean | null;
};

export default function MyProfilePage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        router.push("/login");
        return;
      }

      const user = data.user;

      const res = await supabase
        .from("profiles")
        .select("id, email, full_name, username, bio, is_private")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (res.error) {
        console.error("Profile fetch error:", res.error);
        setLoading(false);
        return;
      }

      // Create profile if missing
      if (!res.data) {
        const ins = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
        });

        if (ins.error) {
          console.error("Profile create error:", ins.error);
          setLoading(false);
          return;
        }

        const again = await supabase
          .from("profiles")
          .select("id, email, full_name, username, bio, is_private")
          .eq("id", user.id)
          .maybeSingle();

        setProfile(again.data);
      } else {
        setProfile(res.data);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading profile…</div>;
  if (!profile) return <div className="p-10 text-center text-red-500">Failed to load profile</div>;

  const displayName = profile.full_name || profile.username || "User";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
              {initials || <User className="w-7 h-7" />}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {profile.username && <p className="text-gray-500">@{profile.username}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {profile.is_private ? "🔒 Private account" : "🌍 Public account"}
              </p>
            </div>

            <button
              onClick={() => router.push("/profile/edit")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              type="button"
            >
              Edit
            </button>
          </div>

          {profile.bio && (
            <p className="mt-4 text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
          )}

          <div className="mt-5 text-sm text-gray-600">
            <div>
              <span className="text-gray-400">Email: </span>
              {profile.email || "—"}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/profile/${profile.id}`)}
          className="w-full bg-white border rounded-2xl p-4 flex items-center justify-between hover:bg-gray-50"
          type="button"
        >
          <div>
            <p className="font-semibold">View public profile</p>
            <p className="text-sm text-gray-500">See how others view you</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
