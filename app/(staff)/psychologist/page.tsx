"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

function routeByEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "/admin";
  if (e.endsWith("@psychologist.feelup")) return "/psychologist";
  return "/mood-feed";
}

export default function PsychologistDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      if (!user) {
        router.replace("/login");
        return;
      }

      const email = user.email ?? null;
      if (!email || !email.toLowerCase().endsWith("@psychologist.feelup")) {
        router.replace(routeByEmail(email));
        return;
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <div className="p-6">Loading psychologist…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Psychologist Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Only emails ending with <b>@psychologist.feelup</b> can access this page.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            type="button"
          >
            Sign out
          </button>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="font-semibold">Pending tickets</div>
          <p className="text-sm text-gray-600 mt-1">
            Here you will handle escalated chats (in-app only).
          </p>

          <div className="mt-4 flex gap-2">
            <Link
              href="/psychologist/chat"
              className="text-sm rounded-xl border px-3 py-2 hover:bg-gray-50"
            >
              Open Chat (test)
            </Link>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Next: list real tickets from <code>escalation_tickets</code> and link to chat.
          </div>
        </div>
      </div>
    </div>
  );
}
