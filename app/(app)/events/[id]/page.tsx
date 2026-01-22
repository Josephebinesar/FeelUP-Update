"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { Calendar, Clock, MapPin, Users, Share2, Bell, User, Video, Timer, Gauge, IndianRupee } from "lucide-react";

type RSVPStatus = "going" | "interested";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  event_date: string;
  event_time: string | null;
  duration: string | null;
  location: string | null;
  is_virtual: boolean | null;
  organizer: string;
  attendees: number | null;
  attendees_count: number | null;
  max_attendees: number | null;
  tags: string[] | null;
  difficulty: string | null;
  price: number | null;
  cover_image_url: string | null;
};

type Profile = { id: string; full_name: string | null; username: string | null };

type CommentRow = {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile | null;
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);

  const [rsvp, setRsvp] = useState<RSVPStatus | null>(null);
  const [reminders, setReminders] = useState<{ "1h": boolean; "1d": boolean }>({ "1h": false, "1d": false });

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState("");

  const logErr = (label: string, err: any) => console.error(label, err?.message || err);

  const attendeesShown = (e: EventRow) => (e.attendees_count ?? e.attendees ?? 0) as number;
  const safeTime = (t: string | null) => (t ? t.slice(0, 5) : "—");

  const load = useCallback(async () => {
    const e = await supabase
      .from("events")
      .select(
        "id,title,description,category,event_date,event_time,duration,location,is_virtual,organizer,attendees,attendees_count,max_attendees,tags,difficulty,price,cover_image_url"
      )
      .eq("id", id)
      .single();

    if (e.error) {
      logErr("LOAD EVENT ERROR:", e.error);
      setEvent(null);
      return;
    }

    setEvent(e.data as any);

    const p = await supabase.from("profiles").select("id,full_name,username").eq("id", e.data.organizer).maybeSingle();
    if (!p.error) setOrganizer((p.data as any) || null);

    if (userId) {
      const r = await supabase
        .from("event_rsvps")
        .select("status")
        .eq("event_id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!r.error) setRsvp((r.data?.status as RSVPStatus) || null);

      const rm = await supabase
        .from("event_reminders")
        .select("kind")
        .eq("event_id", id)
        .eq("user_id", userId);

      if (!rm.error) {
        const map = { "1h": false, "1d": false };
        (rm.data || []).forEach((x: any) => (map[x.kind] = true));
        setReminders(map);
      }
    }

    const c = await supabase
      .from("event_comments")
      .select("id,event_id,user_id,content,created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    if (c.error) {
      logErr("LOAD COMMENTS ERROR:", c.error);
      setComments([]);
      return;
    }

    const list = (c.data || []) as CommentRow[];
    const userIds = Array.from(new Set(list.map((x) => x.user_id)));

    let profilesById: Record<string, Profile> = {};
    if (userIds.length) {
      const pr = await supabase.from("profiles").select("id,full_name,username").in("id", userIds);
      if (!pr.error) (pr.data || []).forEach((pp: any) => (profilesById[pp.id] = pp));
    }

    setComments(list.map((x) => ({ ...x, profiles: profilesById[x.user_id] || null })));
  }, [supabase, id, userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("rt-event-detail")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (p) => {
        if ((p.new as any)?.id === id || (p.old as any)?.id === id) load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_rsvps" }, (p) => {
        if ((p.new as any)?.event_id === id || (p.old as any)?.event_id === id) load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_comments" }, (p) => {
        if ((p.new as any)?.event_id === id || (p.old as any)?.event_id === id) load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_reminders" }, (p) => {
        if ((p.new as any)?.event_id === id || (p.old as any)?.event_id === id) load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, id, load]);

  async function share() {
    try {
      const url = `${window.location.origin}/events/${id}`;
      await navigator.clipboard.writeText(url);
      alert("Event link copied ✅");
    } catch {
      alert("Copy failed (browser blocked).");
    }
  }

  async function setRSVP(status: RSVPStatus) {
    if (!userId) return router.push("/login");
    const res = await supabase.from("event_rsvps").upsert({ event_id: id, user_id: userId, status }, { onConflict: "user_id,event_id" });
    if (res.error) logErr("RSVP ERROR:", res.error);
    load();
  }

  async function leave() {
    if (!userId) return;
    const res = await supabase.from("event_rsvps").delete().eq("event_id", id).eq("user_id", userId);
    if (res.error) logErr("LEAVE ERROR:", res.error);
    load();
  }

  async function toggleReminder(kind: "1h" | "1d") {
    if (!userId || !event) return router.push("/login");

    if (reminders[kind]) {
      const del = await supabase.from("event_reminders").delete().eq("event_id", id).eq("user_id", userId).eq("kind", kind);
      if (del.error) logErr("DELETE REMINDER ERROR:", del.error);
    } else {
      const time = event.event_time ? safeTime(event.event_time) : "00:00";
      const start = new Date(`${event.event_date}T${time}:00`);
      const remindAt = new Date(start);
      remindAt.setHours(remindAt.getHours() - (kind === "1h" ? 1 : 24));

      const ins = await supabase.from("event_reminders").insert({
        event_id: id,
        user_id: userId,
        kind,
        remind_at: remindAt.toISOString(),
      });
      if (ins.error) logErr("CREATE REMINDER ERROR:", ins.error);
    }

    load();
  }

  async function addComment() {
    if (!userId) return router.push("/login");
    const text = commentText.trim();
    if (!text) return;

    const res = await supabase.from("event_comments").insert({
      event_id: id,
      user_id: userId,
      content: text,
    });

    if (res.error) {
      alert(res.error.message || "Failed to comment");
      logErr("ADD COMMENT ERROR:", res.error);
      return;
    }

    setCommentText("");
    load();
  }

  if (!event) return <div className="p-10 text-center">Loading…</div>;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} className="w-full h-60 object-cover rounded-2xl mb-6" alt="cover" />
        ) : (
          <div className="w-full h-60 rounded-2xl bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 mb-6" />
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{event.title}</h1>
              {event.category && <div className="text-sm text-gray-500 mt-1">{event.category}</div>}
              <div className="flex flex-wrap gap-2 mt-3">
                {(event.tags || []).map((t) => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <button onClick={share} className="p-2 rounded-lg hover:bg-gray-100" title="Share" type="button">
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {event.description && <p className="mt-4 text-gray-700">{event.description}</p>}

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="font-semibold">{organizer?.full_name || organizer?.username || "Host"}</div>
                <div className="text-xs text-gray-500">{organizer?.username ? `@${organizer.username}` : "Organizer"}</div>
              </div>
            </div>
            <button onClick={() => router.push(`/profile/${event.organizer}`)} className="text-sm text-blue-600 hover:underline" type="button">
              View organizer
            </button>
          </div>

          <div className="text-sm text-gray-600 space-y-2 mt-6">
            <div className="flex gap-2 items-center">
              <Calendar className="w-4 h-4" />
              {new Date(event.event_date).toDateString()}
            </div>
            <div className="flex gap-2 items-center">
              <Clock className="w-4 h-4" />
              {safeTime(event.event_time)}
            </div>
            <div className="flex gap-2 items-center">
              <MapPin className="w-4 h-4" />
              {event.location || "Online / TBA"}
            </div>
            <div className="flex gap-2 items-center">
              <Users className="w-4 h-4" />
              {attendeesShown(event)} going
              {event.max_attendees ? <span className="text-xs text-gray-400"> / {event.max_attendees}</span> : null}
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              {event.is_virtual ? (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <Video className="w-3 h-3" /> Virtual
                </span>
              ) : null}
              {event.duration ? (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  <Timer className="w-3 h-3" /> {event.duration}
                </span>
              ) : null}
              {event.difficulty ? (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  <Gauge className="w-3 h-3" /> {event.difficulty}
                </span>
              ) : null}
              {typeof event.price === "number" ? (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                  <IndianRupee className="w-3 h-3" /> {event.price}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => toggleReminder("1h")}
              className={`flex-1 border rounded-lg py-2 text-sm inline-flex gap-2 items-center justify-center ${
                reminders["1h"] ? "bg-black text-white border-black" : ""
              }`}
              type="button"
            >
              <Bell className="w-4 h-4" /> Remind 1h
            </button>
            <button
              onClick={() => toggleReminder("1d")}
              className={`flex-1 border rounded-lg py-2 text-sm inline-flex gap-2 items-center justify-center ${
                reminders["1d"] ? "bg-black text-white border-black" : ""
              }`}
              type="button"
            >
              <Bell className="w-4 h-4" /> Remind 1d
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            {rsvp === "going" ? (
              <button onClick={leave} className="flex-1 bg-red-500 text-white py-2 rounded-lg" type="button">
                Leave
              </button>
            ) : (
              <button onClick={() => setRSVP("going")} className="flex-1 bg-blue-600 text-white py-2 rounded-lg" type="button">
                Join
              </button>
            )}
            <button
              onClick={() => setRSVP("interested")}
              className={`flex-1 border py-2 rounded-lg ${rsvp === "interested" ? "bg-gray-100" : ""}`}
              type="button"
            >
              Interested
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
          <h2 className="text-lg font-bold">Q&A / Comments</h2>

          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500">No questions yet. Ask the organizer something.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="border rounded-xl p-3">
                  <div className="text-xs text-gray-500">
                    {c.profiles?.full_name || c.profiles?.username || "User"} ·{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm mt-1">{c.content}</div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="Ask a question…"
            />
            <button onClick={addComment} className="bg-black text-white px-4 rounded-lg" type="button">
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
