"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";

type StaffKind = "admin" | "psychologist";
type StaffRow = { id: string; email: string; kind: StaffKind };

function kindFromEmail(email: string): StaffKind | null {
  const e = email.toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "admin";
  if (e.endsWith("@psychologist.feelup")) return "psychologist";
  return null;
}

function kindBadge(kind: StaffKind) {
  return kind === "admin"
    ? "border-violet-200 bg-violet-50 text-violet-900"
    : "border-sky-200 bg-sky-50 text-sky-900";
}

export default function AdminPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meEmail, setMeEmail] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<StaffKind>("psychologist");

  const [list, setList] = useState<StaffRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function requireAdmin(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user ?? null;

    if (!u) {
      router.replace("/login");
      return null;
    }

    const em = (u.email || "").toLowerCase().trim();
    setMeEmail(em);

    if (!em.endsWith("@admin.feelup")) {
      router.replace("/login");
      return null;
    }

    return data.session?.access_token ?? null;
  }

  async function loadList() {
    const token = await requireAdmin();
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "Failed to load staff list");
        setList([]);
        return;
      }

      setList((json?.items as StaffRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createStaff() {
    const token = await requireAdmin();
    if (!token) return;

    const em = email.trim();
    const pw = password;

    if (!em || !pw) return alert("Please enter email + password.");

    const k = kindFromEmail(em);
    if (!k) return alert("Email must end with @admin.feelup or @psychologist.feelup");
    if (k !== kind) return alert(`Email suffix doesn't match selected type (${kind}).`);

    setBusy(true);
    try {
      const res = await fetch("/api/admin/staff/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: em, password: pw, kind }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) return alert(json?.error || "Create failed");

      setEmail("");
      setPassword("");
      await loadList();
      alert("Staff account created ✅");
    } finally {
      setBusy(false);
    }
  }

  async function del(userId: string) {
    const token = await requireAdmin();
    if (!token) return;

    if (!confirm("Delete this staff account?")) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/staff/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) return alert(json?.error || "Delete failed");

      await loadList();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-6 text-slate-700">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center text-sm font-semibold">
                ADM
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900">Admin Portal</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Logged in as <b className="text-slate-900">{meEmail}</b>
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Staff accounts must use: <b>@admin.feelup</b> or <b>@psychologist.feelup</b>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
            type="button"
          >
            Sign out
          </button>
        </div>

        {/* Create staff */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Create staff account</h2>
              <p className="mt-1 text-sm text-slate-600">Only admin can create/delete. Staff emails must match suffix.</p>
            </div>

            <button
              onClick={loadList}
              disabled={busy}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 active:scale-[0.99]"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
              placeholder="shankar@psychologist.feelup"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
              placeholder="temporary password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
              value={kind}
              onChange={(e) => setKind(e.target.value as StaffKind)}
            >
              <option value="psychologist">psychologist</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              disabled={busy}
              onClick={createStaff}
              className="rounded-2xl bg-slate-900 text-white px-5 py-3 text-sm font-medium shadow-sm hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
              type="button"
            >
              {busy ? "Working..." : "Create"}
            </button>

            <div className="text-xs text-slate-500">
              Tip: Use strong temporary password and ask staff to change after first login.
            </div>
          </div>
        </div>

        {/* Staff list */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Staff accounts</h2>
            <span className="text-xs text-slate-500">{list.length} total</span>
          </div>

          <div className="mt-5 space-y-3">
            {list.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{r.email}</div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${kindBadge(r.kind)}`}>
                      {r.kind}
                    </span>
                  </div>
                </div>

                <button
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 active:scale-[0.99] disabled:opacity-60"
                  disabled={busy}
                  onClick={() => del(r.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}

            {list.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No staff accounts yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
