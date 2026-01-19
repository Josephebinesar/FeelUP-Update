import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const FOLLOWS_FILE_PATH = path.join(process.cwd(), "data", "follows.json");
const DATA_DIR = path.join(process.cwd(), "data");

// Ensure data directory exists
async function ensureDataDirectory() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// Read follows from fileKO
async function readFollows() {
  try {
    await ensureDataDirectory();
    if (!existsSync(FOLLOWS_FILE_PATH)) {
      await writeFile(FOLLOWS_FILE_PATH, JSON.stringify([]));
      return [];
    }
    const data = await readFile(FOLLOWS_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading follows:", error);
    return [];
  }
}

// Write follows to file
async function writeFollows(follows: any[]) {
  try {
    await ensureDataDirectory();
    await writeFile(FOLLOWS_FILE_PATH, JSON.stringify(follows, null, 2));
  } catch (error) {
    console.error("Error writing follows:", error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("user");
    const type = searchParams.get("type"); // 'followers' or 'following'

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email required" },
        { status: 400 },
      );
    }

    const follows = await readFollows();
    let result: any = [];

    if (type === "followers") {
      // Get users who follow this user
      result = follows.filter(
        (follow: any) => follow.following_email === userEmail,
      );
    } else if (type === "following") {
      // Get users this user follows
      result = follows.filter(
        (follow: any) => follow.follower_email === userEmail,
      );
    } else {
      // Get both followers and following
      const followers = follows.filter(
        (follow: any) => follow.following_email === userEmail,
      );
      const following = follows.filter(
        (follow: any) => follow.follower_email === userEmail,
      );
      result = { followers, following };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching follows:", error);
    return NextResponse.json(
      { error: "Failed to fetch follows" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { follower_email, following_email, action } = body;

    if (!follower_email || !following_email) {
      return NextResponse.json(
        {
          error: "Follower email and following email are required",
        },
        { status: 400 },
      );
    }

    if (follower_email === following_email) {
      return NextResponse.json(
        {
          error: "Cannot follow yourself",
        },
        { status: 400 },
      );
    }

    const follows = await readFollows();

    if (action === "unfollow") {
      // Remove follow relationship
      const updatedFollows = follows.filter(
        (follow: any) =>
          !(
            follow.follower_email === follower_email &&
            follow.following_email === following_email
          ),
      );

      await writeFollows(updatedFollows);

      return NextResponse.json({
        message: "Successfully unfollowed user",
        action: "unfollow",
      });
    } else {
      // Check if already following
      const existingFollow = follows.find(
        (follow: any) =>
          follow.follower_email === follower_email &&
          follow.following_email === following_email,
      );

      if (existingFollow) {
        return NextResponse.json(
          {
            error: "Already following this user",
          },
          { status: 400 },
        );
      }

      // Add new follow relationship
      const newFollow = {
        id: Date.now().toString(),
        follower_email,
        following_email,
        created_at: new Date().toISOString(),
      };

      follows.push(newFollow);
      await writeFollows(follows);

      return NextResponse.json({
        message: "Successfully followed user",
        action: "follow",
        data: newFollow,
      });
    }
  } catch (error) {
    console.error("Error managing follow:", error);
    return NextResponse.json(
      { error: "Failed to manage follow" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const followerEmail = searchParams.get("follower");
    const followingEmail = searchParams.get("following");

    if (!followerEmail || !followingEmail) {
      return NextResponse.json(
        {
          error: "Follower email and following email are required",
        },
        { status: 400 },
      );
    }

    const follows = await readFollows();
    const updatedFollows = follows.filter(
      (follow: any) =>
        !(
          follow.follower_email === followerEmail &&
          follow.following_email === followingEmail
        ),
    );

    await writeFollows(updatedFollows);

    return NextResponse.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    console.error("Error unfollowing:", error);
    return NextResponse.json(
      { error: "Failed to unfollow user" },
      { status: 500 },
    );
  }
}
