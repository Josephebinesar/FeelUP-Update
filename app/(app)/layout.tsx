import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { Search } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ✅ Sidebar for USERS only */}
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* ✅ Top Bar for USERS only */}
        <header className="sticky top-0 z-40 bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
            <div className="flex-1 flex justify-center">
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

        <main className="p-4 flex-1">{children}</main>
      </div>
    </div>
  );
}
