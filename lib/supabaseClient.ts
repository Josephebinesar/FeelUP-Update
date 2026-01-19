import { createClient, SupabaseClient } from "@supabase/supabase-js";

/* ====================================================
   SUPABASE CLIENT – FINAL, STABLE, SINGLETON
   ✔ App Router safe
   ✔ AbortError safe
   ✔ Client & Server separated
   ❌ DO NOT MODIFY AFTER THIS
==================================================== */

/* ---------- ENV ---------- */

const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLIC_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!PUBLIC_URL || !PUBLIC_ANON) {
  throw new Error("Missing Supabase public environment variables");
}

/* ---------- BROWSER CLIENT (SINGLETON) ---------- */

let browserClient: SupabaseClient | null = null;

/**
 * ✅ USE THIS IN ALL CLIENT COMPONENTS
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createClient(PUBLIC_URL, PUBLIC_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // REQUIRED for Next.js App Router
    },
  });

  return browserClient;
}

/* ---------- SERVER CLIENT (API / SERVER ONLY) ---------- */

/**
 * ❌ NEVER USE THIS IN CLIENT COMPONENTS
 */
export function createServerSupabaseClient(): SupabaseClient {
  if (!SERVICE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(PUBLIC_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
