"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function NotificationsBell() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", data.user.id)
        .eq("read", false);

      setCount(count || 0);

      supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => setCount((c) => c + 1)
        )
        .subscribe();
    });
  }, [supabase]);

  return (
    <div className="relative">
      <Bell className="w-6 h-6 text-gray-600" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
