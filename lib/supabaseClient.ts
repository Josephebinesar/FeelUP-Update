import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/* ====================================================
   SUPABASE CLIENT – FINAL, STABLE, SINGLETON
   ✔ App Router safe
   ✔ Cookie-based auth for middleware (browser)
   ✔ Service-role server client for APIs
==================================================== */

/* ---------- ENV ---------- */

const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLIC_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!PUBLIC_URL || !PUBLIC_ANON) {
  throw new Error("Missing Supabase public environment variables");
}

/* ---------- BROWSER CLIENT (SINGLETON) ---------- */
/**
 * ✅ USE THIS IN ALL CLIENT COMPONENTS
 * ✅ Uses cookies (required for middleware route protection)
 */
let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  // ✅ This stores session in cookies (middleware can read it)
  browserClient = createBrowserClient(PUBLIC_URL, PUBLIC_ANON);

  return browserClient;
}

/* ---------- SERVER CLIENT (SERVICE ROLE: API / SERVER ONLY) ---------- */
/**
 * ❌ NEVER USE THIS IN CLIENT COMPONENTS
 * ✅ Use only in API routes / server actions (dangerous privileges)
 */
export function createServerSupabaseClient(): SupabaseClient {
  if (!SERVICE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(PUBLIC_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
