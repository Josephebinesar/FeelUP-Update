"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Bell, PlusSquare, User } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function Topbar() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let channel: any;

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      // 1️⃣ Initial unread count
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (!error) {
        setUnreadCount(count || 0);
      }

      // 2️⃣ Realtime updates
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            setUnreadCount((c) => c + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            // Recalculate on mark-as-read
            const { count } = await supabase
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("read", false);

            setUnreadCount(count || 0);
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="hidden md:flex items-center gap-3">
      {/* Messages */}
      <Link
        href="/messages"
        className="p-2 hover:bg-gray-100 rounded-lg"
      >
        <MessageCircle className="w-5 h-5 text-gray-600" />
      </Link>

      {/* Notifications */}
      <Link
        href="/notifications"
        className="relative p-2 hover:bg-gray-100 rounded-lg"
      >
        <Bell className="w-5 h-5 text-gray-600" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>

      {/* Create */}
      <Link
        href="/create"
        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        <PlusSquare className="w-5 h-5" />
      </Link>

      {/* Profile */}
      <Link
        href="/profile"
        className="p-2 hover:bg-gray-100 rounded-lg"
      >
        <User className="w-5 h-5 text-gray-600" />
      </Link>
    </div>
  );
}
