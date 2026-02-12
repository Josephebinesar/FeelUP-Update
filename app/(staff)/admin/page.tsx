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

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="bg-white border rounded-2xl p-6 flex items-start justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Admin Portal</h1>
          <p className="text-sm text-gray-600 mt-1">
            Logged in as <b>{meEmail}</b>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Staff accounts must use: <b>@admin.feelup</b> or <b>@psychologist.feelup</b>
          </p>
        </div>

        <button
          onClick={logout}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          type="button"
        >
          Sign out
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Create staff account</h2>
          <button
            onClick={loadList}
            disabled={busy}
            className="text-sm border rounded-xl px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
            type="button"
          >
            Refresh
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-1">
          Only admin can create/delete. Staff emails must match suffix.
        </p>

        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="shankar@psychologist.feelup"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="temporary password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as StaffKind)}
          >
            <option value="psychologist">psychologist</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <button
          disabled={busy}
          onClick={createStaff}
          className="mt-4 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-60"
          type="button"
        >
          {busy ? "Working..." : "Create"}
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold">Staff accounts</h2>

        <div className="mt-4 space-y-2">
          {list.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="text-sm font-medium">{r.email}</div>
                <div className="text-xs text-gray-500">{r.kind}</div>
              </div>

              <button
                className="text-sm text-red-600 hover:underline disabled:opacity-60"
                disabled={busy}
                onClick={() => del(r.id)}
                type="button"
              >
                Delete
              </button>
            </div>
          ))}

          {list.length === 0 ? <div className="text-sm text-gray-500">No staff accounts yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
