"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  PlusSquare,
  Heart,
  Calendar,
  Users,
  Target,
  BookOpen,
  ChevronRight,
} from "lucide-react";

export default function CreatePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  const actions = [
    {
      title: "Mood Post",
      desc: "Share your mood, reflection, or gratitude.",
      icon: Heart,
      onClick: () => router.push("/mood-feed"),
      badge: "Fast",
    },
    {
      title: "Event",
      desc: "Host a study / wellness / fun meetup.",
      icon: Calendar,
      onClick: () => router.push("/events/create"),
      badge: "Popular",
    },
    {
      title: "Circle",
      desc: "Create a private friend circle.",
      icon: Users,
      onClick: () => router.push("/community/circles/new"),
      badge: "Private",
    },
    {
      title: "Goal",
      desc: "Set a goal and track progress.",
      icon: Target,
      onClick: () => router.push("/goals"),
      badge: "Track",
    },
    {
      title: "Journal",
      desc: "Write a private journal entry.",
      icon: BookOpen,
      onClick: () => router.push("/journal"),
      badge: "Personal",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center">
            <PlusSquare className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create</h1>
        </div>
        <p className="text-gray-600 mb-8">
          Choose what you want to create in FeelUp.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {actions.map((a) => (
            <button
              key={a.title}
              onClick={a.onClick}
              className="text-left bg-white rounded-2xl border shadow-sm p-5 hover:shadow transition"
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 border flex items-center justify-center">
                    <a.icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{a.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{a.desc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {a.badge}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
