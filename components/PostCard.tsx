import React from "react";
import Link from "next/link";

type Profile = {
  full_name?: string;
  avatar_url?: string | null;
};

type Post = {
  id: string;
  content: string;
  mood?: string;
  mood_emoji?: string;
  mood_color?: string;
  anonymous?: boolean;
  owner_email?: string | null;
  created_at?: string;
  profiles?: Profile | null;
};

export default function PostCard({ post }: { post: Post }) {
  const name = post.anonymous
    ? "Anonymous"
    : post.profiles?.full_name || post.owner_email || "User";
  const avatarLetter = name?.[0] || "U";

  function timeAgo(date?: string) {
    if (!date) return "";
    const then = new Date(date).getTime();
    const now = Date.now();
    const sec = Math.floor((now - then) / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }

  const time = timeAgo(post.created_at);

  return (
    <article className="surface-card p-4 mb-4">
      <header className="post-meta">
        <div className="avatar" aria-hidden>
          <span style={{ color: "var(--brand-blue)", fontWeight: 700 }}>
            {avatarLetter}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--brand-black)]">
                {name}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{time}</div>
            </div>
            {post.mood && (
              <div
                className="text-xs px-2 py-1 rounded-full text-[var(--brand-black)]"
                style={{ background: post.mood_color || "rgba(0,0,0,0.04)" }}
              >
                {post.mood_emoji} {post.mood}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mt-3 text-body">{post.content}</div>

      <footer className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 hover:text-[var(--brand-blue)] transition-colors"
            aria-label="Like"
          >
            <span>👍</span>
            <span>Like</span>
          </button>

          <Link
            href={`/profile/${post.owner_email || ""}`}
            className="flex items-center gap-2 hover:text-[var(--brand-blue)] transition-colors"
          >
            <span>💬</span>
            <span>Comment</span>
          </Link>

          <button
            className="flex items-center gap-2 hover:text-[var(--brand-blue)] transition-colors"
            aria-label="Share"
          >
            <span>🔗</span>
            <span>Share</span>
          </button>
        </div>

        <div className="text-xs">ID: {post.id}</div>
      </footer>
    </article>
  );
}
