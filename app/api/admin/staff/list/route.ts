import { NextResponse } from "next/server";
import { getAdminSupabaseService, getSupabaseAnonWithBearer, isAdminEmail, staffKindFromEmail } from "../_utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || "";
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // verify caller is logged-in and is admin
    const anon = getSupabaseAnonWithBearer(token);
    const { data: u } = await anon.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminEmail(u.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // list users using service-role admin API
    const service = getAdminSupabaseService();
    const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 2000 });
    if (error) return NextResponse.json({ error: error.message || "List failed" }, { status: 500 });

    const items =
      (data?.users || [])
        .map((x) => ({ id: x.id, email: x.email || "" }))
        .filter((x) => !!x.email)
        .map((x) => ({ ...x, kind: staffKindFromEmail(x.email) }))
        .filter((x) => x.kind === "admin" || x.kind === "psychologist")
        .map((x) => ({ id: x.id, email: x.email, kind: x.kind as "admin" | "psychologist" }));

    // newest first (best effort)
    items.sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
