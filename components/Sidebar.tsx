"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import {
  Heart,
  Target,
  BookOpen,
  Calendar,
  Users,
  Search,
  MessageCircle,
  BarChart3,
  Settings,
  Info,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // ✅ Memoized singleton instance
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, [supabase]);

  const navigation = [
    { name: "Home", href: "/mood-feed", icon: Heart },
    { name: "Goals", href: "/goals", icon: Target },
    { name: "Journal", href: "/journal", icon: BookOpen },
    { name: "Events", href: "/events", icon: Calendar },

    // 🆕 Community (added after Events)
    { name: "Community", href: "/community", icon: Users },

    { name: "Explore", href: "/explore", icon: Search },
    { name: "Messages", href: "/messages", icon: MessageCircle },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  const resources = [
    { name: "About", href: "/about", icon: Info },
    { name: "Privacy Policy", href: "/privacy", icon: Shield },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Support", href: "/support", icon: HelpCircle },
    { name: "Terms", href: "/terms", icon: FileText },
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r sticky top-0 h-screen">
      {/* Logo */}
      <Link href="/mood-feed" className="p-6 flex gap-3 items-center">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
          F
        </div>
        <div>
          <div className="font-bold">FeelUp</div>
          <div className="text-xs text-gray-500">Positive Vibes</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
              pathname === item.href
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Resources */}
      <div className="px-3 pb-3 space-y-1 border-t pt-3">
        {resources.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </Link>
        ))}
      </div>

      {/* Auth */}
      <div className="p-4 border-t">
        {!user ? (
          <Link
            href="/login"
            className="block text-center bg-blue-600 text-white py-2 rounded-lg text-sm"
          >
            Sign In
          </Link>
        ) : (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}
