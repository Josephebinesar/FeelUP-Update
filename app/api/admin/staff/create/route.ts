import { NextResponse } from "next/server";
import { getAdminSupabaseService, getSupabaseAnonWithBearer, isAdminEmail, staffKindFromEmail } from "../../staff/_utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || "";
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anon = getSupabaseAnonWithBearer(token);
    const { data: u } = await anon.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminEmail(u.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const password = String(body?.password || "");
    const kind = String(body?.kind || "").trim();

    if (!email || !password || !kind) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const suffixKind = staffKindFromEmail(email);
    if (!suffixKind) {
      return NextResponse.json({ error: "Email must end with @admin.feelup or @psychologist.feelup" }, { status: 400 });
    }
    if (suffixKind !== kind) {
      return NextResponse.json({ error: "Email suffix doesn't match selected staff type" }, { status: 400 });
    }

    const service = getAdminSupabaseService();
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) return NextResponse.json({ error: error.message || "Create failed" }, { status: 500 });

    return NextResponse.json({ ok: true, userId: data.user?.id });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
