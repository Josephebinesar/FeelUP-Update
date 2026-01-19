"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import {
  Users,
  Sparkles,
  AlertCircle,
} from "lucide-react";

/* ---------------- TYPES ---------------- */

type TabType = "discover" | "circles" | "features";

/* ---------------- PAGE ---------------- */

export default function CommunityPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("discover");

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
  }, [router, supabase]);

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading community…
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Users className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold text-purple-800">
              Community
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Connect with people, circles, and wellness communities.
          </p>
        </div>

        {/* TABS */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-2 shadow-sm flex gap-2">
            {[
              { id: "discover", label: "🔍 Discover" },
              { id: "circles", label: "🌀 Circles" },
              { id: "features", label: "🌟 Features" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- DISCOVER ---------------- */}
        {activeTab === "discover" && (
          <EmptyState
            icon="🔍"
            title="Discover People"
            description="Community discovery will appear here once users opt into public profiles."
          />
        )}

        {/* ---------------- CIRCLES ---------------- */}
        {activeTab === "circles" && (
          <EmptyState
            icon="🌀"
            title="Your Circles"
            description="You haven't joined any circles yet. Circles will appear once enabled."
            action={{
              label: "Create Circle",
              onClick: () => alert("Circle creation coming soon"),
            }}
          />
        )}

        {/* ---------------- FEATURES ---------------- */}
        {activeTab === "features" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              title="Wellness Circles"
              icon="🌀"
              description="Join topic-based wellness groups"
              status="Available"
            />
            <FeatureCard
              title="Companion Finder"
              icon="🧭"
              description="Find people on similar wellness journeys"
              status="Beta"
            />
            <FeatureCard
              title="Group Challenges"
              icon="🏆"
              description="Participate in community challenges"
              status="Available"
            />
            <FeatureCard
              title="Peer Mentorship"
              icon="🤝"
              description="Connect with mentors"
              status="Coming Soon"
            />
          </div>
        )}

        {/* GUIDELINES */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">
            🤝 Community Guidelines
          </h2>
          <p className="text-gray-700 mb-4 max-w-2xl mx-auto">
            Respect, empathy, and safety are our priorities.
          </p>
          <button
            onClick={() => router.push("/community-guidelines")}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
          >
            Read Guidelines
          </button>
        </div>
      </main>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-white rounded-xl p-10 text-center shadow-sm">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function FeatureCard({
  title,
  icon,
  description,
  status,
}: {
  title: string;
  icon: string;
  description: string;
  status: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
        {status}
      </span>
    </div>
  );
}
