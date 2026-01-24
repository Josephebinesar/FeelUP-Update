import { NextResponse } from "next/server";
import { getAdminSupabaseService, getSupabaseAnonWithBearer, isAdminEmail } from "../../staff/_utils";

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
    const userId = String(body?.userId || "").trim();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const service = getAdminSupabaseService();
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
