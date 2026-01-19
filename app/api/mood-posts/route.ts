import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

// Mock database using JSON file for development
const DB_PATH = path.join(process.cwd(), "data", "mood_posts.json");

// Configure Cloudinary from env
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

function readPosts() {
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

function writePosts(posts: any[]) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(posts, null, 2));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const visibility = url.searchParams.get("visibility") || "public";
    const owner_email = url.searchParams.get("owner_email");

    const allPosts = readPosts();
    let filteredPosts = allPosts;

    // Filter by visibility or owner
    if (owner_email) {
      // If owner_email specified, filter by that owner and then by visibility
      filteredPosts = allPosts.filter((post: any) => post.owner_email === owner_email);
      // If caller didn't request other visibility, only show public by default
      if (visibility === "public") {
        filteredPosts = filteredPosts.filter((post: any) => post.visibility === "public");
      }
    } else if (visibility === "public") {
      filteredPosts = allPosts.filter((post: any) => post.visibility === "public");
    }

    // Sort by created_at descending and limit
    filteredPosts.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    filteredPosts = filteredPosts.slice(0, limit);

    return NextResponse.json({ posts: filteredPosts });
  } catch (err: any) {
    console.error("Mood posts GET error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
  content,
  mood,
  mood_emoji,
  mood_color,
  anonymous,
  owner_email,

  image_base64,
  image_name,
  image_url,
  reposted_from,

  ai_detected,
  ai_confidence,
} = body || {};



    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const allPosts = readPosts();
    const newPost = {
  id: Date.now().toString(),
  content: content.trim(),

  mood: mood || null,
  mood_emoji: mood_emoji || null,
  mood_color: mood_color || null,

  ai_detected: Boolean(ai_detected),
  ai_confidence: Number(ai_confidence) || 0,

  image_url: null,
  reposted_from: reposted_from || null,

  visibility: "public",
  anonymous: !!anonymous,
  owner_email: anonymous ? null : owner_email || null,
  created_at: new Date().toISOString(),

  profiles: anonymous
    ? null
    : {
        full_name: owner_email?.split("@")[0] || "Anonymous User",
        avatar_url: null,
      },
};



    // If an image was provided as base64, upload to Cloudinary and set image_url
    //if (image_base64 && image_name && process.env.CLOUDINARY_CLOUD_NAME) {
      //try {
        // Guess mime type from file extension
        //const ext = path.extname(image_name).toLowerCase().replace(".", "");
        //let mime = "image/png";
        //if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
        //else if (ext === "webp") mime = "image/webp";
        //else if (ext === "gif") mime = "image/gif";

        //const dataUri = `data:${mime};base64,${image_base64}`;
        //const uploadRes = await cloudinary.uploader.upload(dataUri, {
            //folder: "feelup/mood-posts",
        //});
        //newPost.image_url = uploadRes.secure_url;
      //} catch (e) {
        //console.error("Cloudinary upload failed:", e);
      //}
    //}

    // If client provided an existing image_url (e.g., reposting), prefer that
    if (!newPost.image_url && image_url) {
      newPost.image_url = image_url;
    }

    allPosts.push(newPost);
    writePosts(allPosts);

    console.log("Mood post created successfully:", newPost);
    return NextResponse.json({ post: newPost });
  } catch (err: any) {
    console.error("Mood posts POST error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const { content, mood, mood_emoji, mood_color, owner_email } = body || {};

    const allPosts = readPosts();
    const idx = allPosts.findIndex((p: any) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const post = allPosts[idx];
    // Basic ownership check: only allow update if owner_email matches and post is not anonymous
    if (post.anonymous || !owner_email || post.owner_email !== owner_email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (typeof content === "string") post.content = content.trim();
    if (mood) post.mood = mood;
    if (mood_emoji) post.mood_emoji = mood_emoji;
    if (mood_color) post.mood_color = mood_color;
    post.updated_at = new Date().toISOString();

    allPosts[idx] = post;
    writePosts(allPosts);

    return NextResponse.json({ post });
  } catch (err: any) {
    console.error("Mood posts PATCH error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const owner_email = url.searchParams.get("owner_email");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const allPosts = readPosts();
    const idx = allPosts.findIndex((p: any) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const post = allPosts[idx];
    if (post.anonymous || !owner_email || post.owner_email !== owner_email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Remove post
    allPosts.splice(idx, 1);
    writePosts(allPosts);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Mood posts DELETE error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
