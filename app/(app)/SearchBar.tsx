"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

type SearchResult = {
  type: "user" | "post" | "event" | "circle";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ── Close on outside click ── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Debounced search ── */
  const doSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || trimmed.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=8`
        );
        if (!res.ok) { setResults([]); return; }
        const data = await res.json();
        setResults(data?.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  /* ── Navigate to Explore with query pre-filled on "Ask" / Enter ── */
  function goToExplore() {
    const q = query.trim();
    setOpen(false);
    if (q) {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/explore");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      goToExplore();
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  function handleResultClick(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const typeIcon: Record<string, string> = {
    user: "👤",
    post: "📝",
    event: "📅",
    circle: "🔒",
  };

  return (
    <div ref={containerRef} className="relative hidden sm:flex w-full max-w-2xl">
      {/* Input row */}
      <div className="flex items-center w-full bg-gray-50 border rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-300 transition">
        {searching ? (
          <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
        )}

        <input
          ref={inputRef}
          id="app-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search people, posts, events…"
          className="flex-1 px-3 bg-transparent outline-none text-sm placeholder:text-gray-400"
          autoComplete="off"
        />

        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            className="p-0.5 text-gray-400 hover:text-gray-600"
            type="button"
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={goToExplore}
          className="ml-2 px-4 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
          type="button"
        >
          Ask
        </button>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] z-50 overflow-hidden">
          <div className="py-1">
            {results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                onClick={() => handleResultClick(r.href)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition"
              >
                <span className="text-lg shrink-0">{typeIcon[r.type]}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                  {r.subtitle && (
                    <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>
                  )}
                </div>
                <span className="ml-auto text-[11px] text-gray-400 capitalize shrink-0">
                  {r.type}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t px-4 py-2">
            <button
              type="button"
              onClick={goToExplore}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              See all results for "{query}" →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
