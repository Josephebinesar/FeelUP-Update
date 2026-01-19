import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "bookmarks.json");

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readBookmarks() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeBookmarks(obj: any) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_email = url.searchParams.get("user_email");
    const bookmarks = readBookmarks();
    if (user_email) {
      const list = bookmarks[user_email] || [];
      return NextResponse.json({ posts: list });
    }
    return NextResponse.json({ data: bookmarks });
  } catch (err: any) {
    console.error("Bookmarks GET error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_email, post_id } = body || {};
    if (!user_email || !post_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const bookmarks = readBookmarks();
    const list = bookmarks[user_email] || [];
    if (!list.includes(post_id)) list.push(post_id);
    bookmarks[user_email] = list;
    writeBookmarks(bookmarks);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Bookmarks POST error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const user_email = url.searchParams.get("user_email");
    const post_id = url.searchParams.get("post_id");
    if (!user_email || !post_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const bookmarks = readBookmarks();
    const list = bookmarks[user_email] || [];
    bookmarks[user_email] = list.filter((id: string) => id !== post_id);
    writeBookmarks(bookmarks);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Bookmarks DELETE error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
