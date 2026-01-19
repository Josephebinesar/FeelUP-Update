import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Mock database using JSON file for development
const DB_PATH = path.join(process.cwd(), "data", "reactions.json");

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readReactions() {
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

function writeReactions(reactions: any[]) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(reactions, null, 2));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
    }

    const allReactions = readReactions();
    const postReactions = allReactions.filter(
      (reaction: any) => reaction.post_id === postId,
    );

    // Group by reaction type and count
    const reactionSummary = postReactions.reduce((acc: any, reaction: any) => {
      if (!acc[reaction.reaction_type]) {
        acc[reaction.reaction_type] = { count: 0, users: [] };
      }
      acc[reaction.reaction_type].count++;
      acc[reaction.reaction_type].users.push(
        reaction.user_email?.split("@")[0] || "Anonymous",
      );
      return acc;
    }, {});

    return NextResponse.json({ reactions: reactionSummary });
  } catch (err: any) {
    console.error("Reactions GET error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { post_id, user_email, reaction_type } = await req.json();

    if (!post_id || !user_email || !reaction_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate reaction type (positive reactions only)
    const validReactions = ["cheer", "support", "hug", "care"];
    if (!validReactions.includes(reaction_type)) {
      return NextResponse.json(
        { error: "Invalid reaction type" },
        { status: 400 },
      );
    }

    const allReactions = readReactions();

    // Check if reaction already exists
    const existingIndex = allReactions.findIndex(
      (reaction: any) =>
        reaction.post_id === post_id &&
        reaction.user_email === user_email &&
        reaction.reaction_type === reaction_type,
    );

    if (existingIndex !== -1) {
      // Remove reaction if it exists (toggle)
      allReactions.splice(existingIndex, 1);
      writeReactions(allReactions);
      return NextResponse.json({ success: true, action: "removed" });
    } else {
      // Add new reaction
      const newReaction = {
        id: Date.now().toString(),
        post_id: post_id,
        user_email: user_email,
        reaction_type: reaction_type,
        created_at: new Date().toISOString(),
      };

      allReactions.push(newReaction);
      writeReactions(allReactions);
      return NextResponse.json({
        success: true,
        action: "added",
        reaction: newReaction,
      });
    }
  } catch (err: any) {
    console.error("Reactions POST error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
