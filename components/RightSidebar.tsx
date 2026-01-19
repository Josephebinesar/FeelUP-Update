"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

export default function RightSidebar({ userEmail }: { userEmail?: string }) {
  const supabase = createBrowserSupabaseClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setProfiles(data);
      }

      setLoading(false);
    }

    loadProfiles();
  }, [supabase]);

  return (
    <aside className="hidden lg:block">
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Suggested profiles
          </h3>

          <Link
            href="/explore"
            className="text-xs text-blue-600 hover:underline"
          >
            See all
          </Link>
        </div>

        {loading && (
          <p className="text-sm text-gray-400">Loading...</p>
        )}

        {!loading && profiles.length === 0 && (
          <p className="text-sm text-gray-400">No users found</p>
        )}

        <ul className="space-y-3">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex items-center justify-between"
            >
              <div>
                <Link
                  href={`/profile/${profile.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {profile.username || "Unnamed user"}
                </Link>

                {profile.full_name && (
                  <p className="text-xs text-gray-500">
                    {profile.full_name}
                  </p>
                )}
              </div>

              <Link
                href={`/profile/${profile.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View profile
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
