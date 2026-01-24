import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function routeByEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "admin";
  if (e.endsWith("@psychologist.feelup")) return "psychologist";
  return "user";
}

const USER_APP_PREFIXES = [
  "/mood-feed",
  "/goals",
  "/journal",
  "/events",
  "/community",
  "/explore",
  "/messages",
  "/analytics",
  "/ai-buddy",
];

const ADMIN_PREFIXES = ["/admin"];
const PSY_PREFIXES = ["/psychologist"];

const PUBLIC_PREFIXES = ["/login", "/privacy", "/terms", "/about", "/support", "/"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (startsWithAny(pathname, PUBLIC_PREFIXES)) {
    return NextResponse.next();
  }

  const needsAuth =
    startsWithAny(pathname, USER_APP_PREFIXES) ||
    startsWithAny(pathname, ADMIN_PREFIXES) ||
    startsWithAny(pathname, PSY_PREFIXES);

  if (!needsAuth) return NextResponse.next();

  // ✅ Create response so Supabase can read/write cookies
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ This reads session from cookies (works in middleware)
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const who = routeByEmail(data.user.email);

  // ✅ Role route rules
  if (startsWithAny(pathname, ADMIN_PREFIXES) && who !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (startsWithAny(pathname, PSY_PREFIXES) && who !== "psychologist") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (startsWithAny(pathname, USER_APP_PREFIXES)) {
    if (who === "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    if (who === "psychologist") {
      const url = req.nextUrl.clone();
      url.pathname = "/psychologist";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
