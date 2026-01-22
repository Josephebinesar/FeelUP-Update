"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { Search } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ Pages that should NOT show normal app layout
  const isAdmin = pathname.startsWith("/admin");
  const isPsychologist = pathname.startsWith("/psychologist");
  const isLogin = pathname.startsWith("/login");

  // For these pages, render clean (no sidebar/topbar)
  if (isAdmin || isPsychologist || isLogin) {
    return <>{children}</>;
  }

  // ✅ Normal FeelUp layout
  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50">
      <div className="flex h-full">
        {/* Sidebar */}
        <Sidebar />

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-40 bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
              {/* Search */}
              <div className="flex-1 flex justify-center min-w-0">
                <div className="hidden sm:flex items-center w-full max-w-2xl bg-gray-50 border rounded-xl px-4 py-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    placeholder="Find anything"
                    className="flex-1 px-3 bg-transparent outline-none text-sm"
                  />
                  <button className="ml-2 px-4 py-1 rounded-lg bg-blue-500 text-white text-sm">
                    Ask
                  </button>
                </div>
              </div>

              <Topbar />
            </div>
          </header>

          {/* Content scroll */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
