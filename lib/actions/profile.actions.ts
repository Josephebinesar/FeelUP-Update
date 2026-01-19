"use server";

import { createClient } from "@/lib/supabase/server";

/* 1️⃣ Auto-create profile after signup */
export async function createProfile(
  userId: string,
  fullName: string,
  username: string
) {
  const supabase = createClient();

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    full_name: fullName,
    username: username.toLowerCase(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

/* 2️⃣ Username availability check */
export async function isUsernameAvailable(username: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username.toLowerCase())
    .maybeSingle(); // ✅ FIX

  if (error) {
    console.error("Username check error:", error.message);
    return false;
  }

  return !data; // true = available
}
