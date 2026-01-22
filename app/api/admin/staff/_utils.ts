import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export function isAdminEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  return e.endsWith("@admin.feelup");
}

export function staffKindFromEmail(email: string) {
  const e = email.toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "admin";
  if (e.endsWith("@psychologist.feelup")) return "psychologist";
  return null;
}

export function getSupabaseAnonWithBearer(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON KEY");

  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAdminSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
