"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Bell, CheckCheck, ChevronLeft, Dot, Loader2 } from "lucide-react";

type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string | null;
  read: boolean | null;
  created_at: string | null;
};

type ProfileMini = {
  id: string;
  full_name: string | null;
  username: string | null;
};

function timeAgo(date?: string | null) {
  if (!date) return "";
  const ts = new Date(date).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function titleForType(type?: string | null) {
  switch (type) {
    case "follow_request":
      return "New follow request";
    case "follow":
      return "New follower";
    case "circle_invite":
      return "Circle invite";
    case "event_invite":
      return "Event invite";
    case "comment":
      return "New comment";
    case "reaction":
      return "New reaction";
    default:
      return type ? type.replaceAll("_", " ") : "Notification";
  }
}

function routeForType(type?: string | null, actorId?: string | null) {
  // You can customize routing later (event_id, circle_id, post_id etc. from notification payload/meta)
  if (type === "follow_request" || type === "follow") {
    return actorId ? `/profile/${actorId}` : null;
  }
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini>>(
    {}
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadProfilesFor = useCallback(
    async (rows: NotificationRow[]) => {
      const actorIds = Array.from(
        new Set(rows.map((r) => r.actor_id).filter(Boolean))
      ) as string[];

      if (actorIds.length === 0) {
        setProfilesById({});
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", actorIds);

      if (error) return;

      const map: Record<string, ProfileMini> = {};
      (data || []).forEach((p: any) => {
        map[p.id] = p;
      });
      setProfilesById(map);
    },
    [supabase]
  );

  const loadNotifications = useCallback(async () => {
    setErrorMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setErrorMsg(error.message || "Failed to load notifications");
      setItems([]);
      return;
    }

    const list = (data || []) as NotificationRow[];
    setItems(list);
    await loadProfilesFor(list);
  }, [supabase, router, loadProfilesFor]);

  // AUTH + INIT
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setMe(data.user);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  // LOAD
  useEffect(() => {
    if (!me) return;
    loadNotifications();
  }, [me, loadNotifications]);

  // REALTIME
  useEffect(() => {
    if (!me) return;

    // cleanup previous
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`notifications-page-${me.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${me.id}`,
        },
        () => {
          // simplest + reliable
          loadNotifications();
        }
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [me, supabase, loadNotifications]);

  const unreadCount = items.filter((n) => n.read === false).length;

  const markOneRead = async (id: string) => {
    // optimistic UI
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      // rollback if failed
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  };

  const markAllRead = async () => {
    if (!me) return;

    // optimistic
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", me.id)
      .eq("read", false);

    if (error) {
      // if failed, refetch to be safe
      loadNotifications();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl border bg-white hover:bg-gray-50"
              type="button"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
              <Bell className="w-6 h-6 text-purple-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up ✅"}
              </p>
            </div>
          </div>

          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-40 disabled:hover:bg-purple-700"
            type="button"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {errorMsg}
          </div>
        )}

        {/* List */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <div className="font-bold text-gray-900">No notifications</div>
              <div className="text-sm text-gray-600 mt-1">
                When something happens (follows, requests, invites), it will show here.
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n) => {
                const actor = n.actor_id ? profilesById[n.actor_id] : null;
                const actorName =
                  actor?.full_name || (actor?.username ? `@${actor.username}` : null) || "Someone";

                const title = titleForType(n.type);
                const when = timeAgo(n.created_at);
                const goTo = routeForType(n.type, n.actor_id);

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={async () => {
                      if (n.read === false) await markOneRead(n.id);
                      if (goTo) router.push(goTo);
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition flex items-start gap-3 ${
                      n.read === false ? "bg-purple-50/30" : ""
                    }`}
                  >
                    <div className="mt-1">
                      {n.read === false ? (
                        <Dot className="w-7 h-7 text-purple-700" />
                      ) : (
                        <div className="w-7 h-7 rounded-full border bg-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-gray-900 truncate">
                          {title}
                        </div>
                        <div className="text-xs text-gray-500 shrink-0">
                          {when}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 mt-1 truncate">
                        {actorName}
                        {n.type === "follow_request"
                          ? " sent you a follow request."
                          : n.type === "follow"
                          ? " started following you."
                          : n.type === "circle_invite"
                          ? " invited you to a circle."
                          : ""}
                      </div>

                      {goTo && (
                        <div className="text-xs text-purple-700 font-semibold mt-2">
                          Tap to view
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
