import Link from "next/link";

export default function LeftSidebar() {
  return (
    <aside className="hidden lg:block w-64 pr-6">
      <div className="sticky top-24">
        <div className="surface-card p-4 mb-4">
          <h4 className="text-sm font-semibold mb-2">Circles</h4>
          <ul className="text-[var(--text-muted)] space-y-2">
            <li>
              <Link href="/circles/wellness" className="hover:underline">
                #wellness
              </Link>
            </li>
            <li>
              <Link href="/circles/gratitude" className="hover:underline">
                #gratitude
              </Link>
            </li>
            <li>
              <Link href="/circles/mindfulness" className="hover:underline">
                #mindfulness
              </Link>
            </li>
            <li>
              <Link href="/circles/exercise" className="hover:underline">
                #exercise
              </Link>
            </li>
          </ul>
        </div>

        <div className="surface-card p-4">
          <h4 className="text-sm font-semibold mb-2">Discover</h4>
          <ul className="text-[var(--text-muted)] space-y-2">
            <li>
              <Link href="/discover" className="hover:underline">
                Trending emotions
              </Link>
            </li>
            <li>
              <Link href="/support" className="hover:underline">
                Support hub
              </Link>
            </li>
            <li>
              <Link href="/anonymous" className="hover:underline">
                Anonymous posts
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
