"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { X, Lock, Users, Globe, Loader2, Sparkles } from "lucide-react";

type Visibility = "public" | "followers" | "circle";

interface Props {
  onClose: () => void;
  onCreated?: (circleId: string) => void;
}

function safeMsg(err: any) {
  return (
    (typeof err?.message === "string" && err.message) ||
    (typeof err === "string" && err) ||
    "Unknown error"
  );
}

export default function CreateCircleModal({ onClose, onCreated }: Props) {
  const supabase = createBrowserSupabaseClient();

  const [me, setMe] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("circle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMe(data.user);
    });
  }, [supabase]);

  /* ── Close on ESC ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── Create ── */
  const createCircle = async () => {
    const n = name.trim();
    const d = description.trim();

    if (!n) { setError("Circle name is required"); return; }
    if (!me) { setError("Not authenticated. Please refresh."); return; }

    setError(null);
    setSaving(true);

    try {
      // Create circle
      const { data: circle, error: circleErr } = await supabase
        .from("community_circles")
        .insert({ name: n, description: d || null, visibility, owner_id: me.id })
        .select()
        .single();

      if (circleErr || !circle) {
        setError(circleErr?.message || "Failed to create circle");
        setSaving(false);
        return;
      }

      // Add owner as admin member
      const { error: memberErr } = await supabase.from("circle_members").insert({
        circle_id: circle.id,
        user_id: me.id,
        role: "admin",
      });

      if (memberErr) {
        const msg = safeMsg(memberErr).toLowerCase();
        if (!msg.includes("duplicate") && !msg.includes("unique")) {
          setError("Circle created but failed to set admin role: " + safeMsg(memberErr));
          setSaving(false);
          return;
        }
      }

      onCreated?.(circle.id);
      onClose();
    } catch (e: any) {
      setError(safeMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const visOptions: Array<{ value: Visibility; icon: React.ReactNode; label: string; desc: string }> = [
    { value: "circle", icon: <Lock className="w-4 h-4 text-purple-700" />, label: "Invite-only", desc: "Best for trusted sharing" },
    { value: "followers", icon: <Users className="w-4 h-4 text-purple-700" />, label: "Followers", desc: "People who follow you" },
    { value: "public", icon: <Globe className="w-4 h-4 text-purple-700" />, label: "Public", desc: "Anyone can join" },
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Blurred bg */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-lg">
        {/* Glow ring */}
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-purple-400/40 via-pink-400/30 to-blue-400/40 blur-xl opacity-80" />

        <div className="relative rounded-[28px] border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Create a Circle</h2>
                <p className="text-xs text-gray-600">Private space for trusted sharing</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-500"
              type="button"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Circle name <span className="text-red-500">*</span>
              </label>
              <input
                id="circle-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Final Year Study Squad"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-200 shadow-sm placeholder:text-gray-400"
                maxLength={80}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this circle about?"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-200 shadow-sm h-24 resize-none placeholder:text-gray-400"
                maxLength={500}
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Visibility</label>
              <div className="grid grid-cols-3 gap-2">
                {visOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`rounded-2xl border px-3 py-3 text-left transition hover:bg-gray-50 ${
                      visibility === opt.value
                        ? "border-purple-400 bg-purple-50 ring-2 ring-purple-200"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      {opt.icon} {opt.label}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={createCircle}
              disabled={saving || !name.trim()}
              type="button"
              className="flex-1 rounded-2xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-indigo-700 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(88,28,135,0.5)] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                "Create Circle"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
