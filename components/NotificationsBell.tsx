"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function NotificationsBell() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [count, setCount] = useState<number>(0);
  const [ready, setReady] = useState(false);

  // keep channel ref so we can clean it up properly
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setReady(false);

      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !data.user) {
        setCount(0);
        setReady(true);
        return;
      }

      const userId = data.user.id;

      // 1) initial unread count
      const { count: unreadCount, error: countErr } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (!mounted) return;

      if (!countErr) setCount(unreadCount || 0);

      // 2) cleanup any old channel (important for hot reload / remount)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // 3) subscribe realtime (INSERT + UPDATE)
      const ch = supabase
        .channel(`notifications-bell-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            // if the inserted row is unread, increment
            const row = payload.new as any;
            if (row?.read === false) setCount((c) => c + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            // if a notification becomes read/unread, adjust count safely by refetching
            // (simple + reliable)
            supabase
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("read", false)
              .then(({ count }) => {
                if (mounted) setCount(count || 0);
              });
          }
        )
        .subscribe();

      channelRef.current = ch;
      setReady(true);
    }

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase]);

  return (
    <button
      type="button"
      onClick={() => router.push("/notifications")}
      className="relative inline-flex items-center justify-center rounded-xl p-2 hover:bg-gray-100 transition"
      aria-label="Notifications"
      title="Notifications"
    >
      {!ready ? (
        <div className="w-6 h-6 rounded bg-gray-200 animate-pulse" />
      ) : (
        <Bell className="w-6 h-6 text-gray-700" />
      )}

      {ready && count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center shadow">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
