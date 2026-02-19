"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Settings as SettingsIcon } from "lucide-react";

interface User {
  name: string;
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // 🔹 TEMP MOCK USER (until auth is added back)
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({
    notifications: true,
    privacy_level: "public",
    theme: "default",
    email_updates: true,
    streak_reminders: true,
    mood_tracking: true,
  });

  // Simulate logged-in user
  useEffect(() => {
    const mockUser = {
      name: "Demo User",
      email: "demo@feelup.app",
    };

    setUser(mockUser);
    setLoading(false);
  }, []);

  const saveSettings = async () => {
    alert("✅ Settings saved (local only for now)");
  };

  const handleLogout = () => {
    alert("Logged out (mock)");
    router.push("/");
  };

  const deleteAccount = () => {
    if (!confirm("Are you sure you want to delete your account?")) return;
    alert("Account deleted (mock)");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 soft-glow">
          <div className="flex items-center gap-3 mb-8">
            <SettingsIcon className="w-8 h-8 text-[var(--brand-blue)]" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>

          {/* Privacy */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Privacy</h2>
            <select
              value={settings.privacy_level}
              onChange={(e) =>
                setSettings({ ...settings, privacy_level: e.target.value })
              }
              className="input-field"
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Private</option>
            </select>
          </section>

          {/* Notifications */}
          <section className="mb-8 space-y-4">
            <h2 className="text-xl font-semibold">Notifications</h2>

            {[
              ["notifications", "Push Notifications"],
              ["email_updates", "Email Updates"],
              ["streak_reminders", "Streak Reminders"],
              ["mood_tracking", "Mood Tracking"],
            ].map(([key, label]) => (
              <div key={key} className="flex justify-between items-center">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={(settings as any)[key]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [key]: e.target.checked,
                    })
                  }
                />
              </div>
            ))}
          </section>

          {/* Theme */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Theme</h2>
            <select
              value={settings.theme}
              onChange={(e) =>
                setSettings({ ...settings, theme: e.target.value })
              }
              className="input-field"
            >
              <option value="default">Default</option>
              <option value="minimal">Minimal</option>
              <option value="colorful">Colorful</option>
            </select>
          </section>

          {/* Actions */}
          <div className="space-y-4">
            <button onClick={saveSettings} className="btn-primary w-full">
              💾 Save Settings
            </button>

            <button onClick={handleLogout} className="btn-secondary w-full">
              🚪 Log Out
            </button>

            <button
              onClick={deleteAccount}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
