import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Providers from "@/components/Providers";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { Search } from "lucide-react";

/* ---------------- Fonts ---------------- */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ---------------- Metadata ---------------- */

export const metadata: Metadata = {
  title: "FeelUp",
  description: "Wellness & Mood Tracking",
  icons: {
    icon: "/favicon.png",
  },
};

/* ---------------- Root Layout ---------------- */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>
          <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Area */}
            <div className="flex-1 flex flex-col">
              {/* Top Bar */}
              <header className="sticky top-0 z-40 bg-white border-b">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
                  {/* Search */}
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

                  {/* Right Actions */}
                  <Topbar />
                </div>
              </header>

              {/* Page Content */}
              <main className="p-4 flex-1">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
