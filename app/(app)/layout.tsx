import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Providers from "@/components/Providers";
import SearchBar from "./SearchBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen bg-gray-50">
        {/* ✅ Sidebar for USERS only */}
        <Sidebar />

        <div className="flex-1 flex flex-col">
          {/* ✅ Top Bar for USERS only */}
          <header className="sticky top-0 z-40 bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
              <div className="flex-1 flex justify-center">
                <SearchBar />
              </div>

              <Topbar />
            </div>
          </header>

          <main className="p-4 flex-1">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
