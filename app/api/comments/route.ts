import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Mock database using JSON file for development
const DB_PATH = path.join(process.cwd(), "data", "comments.json");

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readComments() {
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

function writeComments(comments: any[]) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(comments, null, 2));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
    }

    const allComments = readComments();
    const postComments = allComments.filter(
      (comment: any) => comment.post_id === postId,
    );

    // Sort by created_at ascending
    postComments.sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return NextResponse.json({ comments: postComments });
  } catch (err: any) {
    console.error("Comments GET error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { post_id, content, anonymous, user_email } = body || {};

    if (!post_id || !content || !user_email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Simple positivity filter - reject negative words
    const negativeWords = [
      "hate",
      "awful",
      "terrible",
      "stupid",
      "ugly",
      "worst",
      "suck",
    ];
    const lowerContent = content.toLowerCase();
    const hasNegativeWords = negativeWords.some((word) =>
      lowerContent.includes(word),
    );

    if (hasNegativeWords) {
      return NextResponse.json(
        {
          error: "Please keep comments positive and supportive! 💕",
        },
        { status: 400 },
      );
    }

    const allComments = readComments();
    const newComment = {
      id: Date.now().toString(),
      post_id: post_id,
      content: content.trim(),
      anonymous: !!anonymous,
      user_email: anonymous ? null : user_email,
      created_at: new Date().toISOString(),
      profiles: anonymous
        ? null
        : {
            full_name: user_email?.split("@")[0] || "Anonymous User",
            avatar_url: null,
          },
    };

    allComments.push(newComment);
    writeComments(allComments);

    console.log("Comment created successfully:", newComment);
    return NextResponse.json({ comment: newComment });
  } catch (err: any) {
    console.error("Comments POST error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
