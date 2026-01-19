import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

// Mock database using JSON file for development
const DB_PATH = path.join(process.cwd(), "data", "journal_entries.json");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readEntries() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeEntries(entries: any[]) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(entries, null, 2));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_email = url.searchParams.get("user_email");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const is_gratitude = url.searchParams.get("is_gratitude") === "true";

    if (!user_email) {
      return NextResponse.json(
        { error: "User email required" },
        { status: 400 },
      );
    }

    const allEntries = readEntries();
    let userEntries = allEntries.filter(
      (entry: any) => entry.user_email === user_email,
    );

    if (is_gratitude) {
      userEntries = userEntries.filter(
        (entry: any) => entry.is_gratitude === true,
      );
    }

    // Sort by created_at descending and limit
    userEntries.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    userEntries = userEntries.slice(0, limit);

    return NextResponse.json({ entries: userEntries });
  } catch (err: any) {
    console.error("Journal GET error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const {
      user_email,
      title,
      content,
      mood,
      mood_emoji,
      energy_level,
      tags,
      is_gratitude,
      can_convert_to_post,
      image_base64,
      image_name,
    } = await req.json();

    if (!user_email || !content?.trim()) {
      return NextResponse.json(
        { error: "User email and content are required" },
        { status: 400 },
      );
    }

    const allEntries = readEntries();
    const newEntry = {
      id: Date.now().toString(), // Simple ID generation
      user_email: user_email,
      title: title?.trim() || null,
      content: content.trim(),
      image_url: null as string | null,
      mood_tag: mood || null,
      mood_emoji: mood_emoji || null,
      energy_level: energy_level || null,
      tags: tags || [],
      is_gratitude: !!is_gratitude,
      can_convert_to_post: !!can_convert_to_post,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Upload image to Cloudinary if provided
    if (image_base64 && image_name && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const ext = path.extname(image_name).toLowerCase().replace(".", "");
        let mime = "image/png";
        if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
        else if (ext === "webp") mime = "image/webp";
        else if (ext === "gif") mime = "image/gif";

        const dataUri = `data:${mime};base64,${image_base64}`;
        const uploadRes = await cloudinary.uploader.upload(dataUri, {
          folder: "feelup/journal",
        });
        newEntry.image_url = uploadRes.secure_url;
      } catch (e) {
        console.error("Cloudinary upload failed for journal image:", e);
      }
    }

    allEntries.push(newEntry);
    writeEntries(allEntries);

    console.log("Journal entry created successfully:", newEntry);
    return NextResponse.json({ entry: newEntry });
  } catch (err: any) {
    console.error("Journal POST error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { entry_id, user_email, title, content, mood, mood_emoji, tags } =
      await req.json();

    if (!entry_id || !user_email) {
      return NextResponse.json(
        { error: "Entry ID and user email required" },
        { status: 400 },
      );
    }

    const allEntries = readEntries();
    const entryIndex = allEntries.findIndex(
      (entry: any) => entry.id === entry_id && entry.user_email === user_email,
    );

    if (entryIndex === -1) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = allEntries[entryIndex];

    // Update fields
    if (title !== undefined) entry.title = title?.trim() || null;
    if (content !== undefined) entry.content = content.trim();
    if (mood !== undefined) entry.mood_tag = mood || null;
    if (mood_emoji !== undefined) entry.mood_emoji = mood_emoji || null;
    if (tags !== undefined) entry.tags = tags || [];

    entry.updated_at = new Date().toISOString();

    allEntries[entryIndex] = entry;
    writeEntries(allEntries);

    return NextResponse.json({ entry: entry });
  } catch (err: any) {
    console.error("Journal PATCH error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const entry_id = url.searchParams.get("entry_id");
    const user_email = url.searchParams.get("user_email");

    if (!entry_id || !user_email) {
      return NextResponse.json(
        { error: "Entry ID and user email required" },
        { status: 400 },
      );
    }

    const allEntries = readEntries();
    const entryIndex = allEntries.findIndex(
      (entry: any) => entry.id === entry_id && entry.user_email === user_email,
    );

    if (entryIndex === -1) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const [removed] = allEntries.splice(entryIndex, 1);

    // If the entry had an uploaded image and Cloudinary is configured, attempt to delete it.
    if (removed?.image_url && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        // Cloudinary public_id extraction (best-effort)
        const urlParts = removed.image_url.split("/");
        const last = urlParts[urlParts.length - 1] || "";
        const publicId = last.split(".")[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      } catch (e) {
        console.warn("Failed to delete Cloudinary image for journal entry:", e);
      }
    }

    writeEntries(allEntries);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Journal DELETE error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
