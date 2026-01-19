"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

export default function ExploreClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD USERS ---------------- */

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .order("username", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("Explore fetch error:", error);
        setLoading(false);
        return;
      }

      setUsers(data || []);
      setLoading(false);
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* ---------------- FILTER ---------------- */

  const filteredUsers = users.filter((u) => {
    const name = u.username || u.full_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div className="p-6 text-center">Loading users...</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Explore</h1>

      <input
        className="w-full border px-3 py-2 rounded mb-4"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredUsers.length === 0 && (
        <p className="text-gray-500">No users found</p>
      )}

      {filteredUsers.map((u) => (
        <div
          key={u.id}
          className="flex justify-between items-center py-3 border-b"
        >
          <div>
            <p className="font-medium">
              {u.full_name || u.username || "Unnamed user"}
            </p>

            {u.username && (
              <p className="text-sm text-gray-500">@{u.username}</p>
            )}
          </div>

          <div className="flex gap-3">
            {/* VIEW PROFILE (ID BASED) */}
            <button
              onClick={() => router.push(`/profile/${u.id}`)}
              className="text-blue-600 font-semibold"
            >
              View Profile
            </button>

            {/* MESSAGE */}
            <button
              onClick={() => router.push(`/messages/${u.id}`)}
              className="text-purple-600 font-semibold"
            >
              Message
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
