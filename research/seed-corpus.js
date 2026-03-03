require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_USER_IDS = [
  "941ee23b-5877-42df-9b4a-280c34c0d5f8",
  "64831d70-0558-4a96-aea0-7541fa4af306",
  "f8d162b7-e323-4562-8a9a-85cdf13650bb",
  "249eeafc-17db-4046-b14d-05d531a77a43",
  "9f60c94c-1074-4e9b-9c6d-9cbadb91d6f6",
  "16dddd35-a30e-460e-a8aa-5c2dc4131795",
  "1a4ac942-9110-4714-b83e-276e5a43bc34",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomUser() {
  return randomFrom(VALID_USER_IDS);
}

const ACADEMIC_POSTS = [
  "I failed two subjects this semester and I don’t know how to face my parents.",
  "My CGPA dropped badly and I feel like my future is collapsing.",
  "I studied so hard but still could not clear the backlog.",
  "Everyone else got internships except me and I feel left behind.",
  "Placement season is making me extremely anxious every day.",
  "I cannot focus on studying because I keep thinking about failing.",
  "My attendance is low and I am scared of being detained.",
  "I feel embarrassed because my friends are doing better academically.",
  "I am terrified of checking my exam results tomorrow.",
  "I failed my internal exams and I feel completely useless.",
  "I don’t think I am smart enough to survive engineering.",
  "My parents expect top grades but I keep disappointing them.",
  "I feel overwhelmed by the number of assignments.",
  "My semester results destroyed my confidence.",
  "I regret choosing this course because I cannot cope.",
  "I panic every time someone talks about placements.",
  "I am scared my backlog will ruin my career.",
  "Seeing others succeed academically makes me feel inferior.",
  "I feel mentally exhausted from continuous exams.",
  "I keep comparing my CGPA with others and it hurts.",
  "I don’t know how to prepare for campus interviews.",
  "I am afraid of failing the same subject again.",
  "Academic pressure is affecting my sleep.",
  "I feel like giving up because my grades are too low.",
  "My performance in viva was terrible and I cannot stop thinking about it.",
];

async function seedAcademic() {
  console.log("📚 Seeding 100 academic stress posts...");

  const posts = [];

  for (let i = 0; i < 100; i++) {
    posts.push({
      id: randomUUID(),
      content: randomFrom(ACADEMIC_POSTS),
      mood: "Anxious",
      mood_emoji: "😰",
      visibility: "public",
      anonymous: true,
      owner_id: randomUser(),
      embedding: null,
      created_at: new Date().toISOString(),
    });
  }

  const { error } = await supabase.from("mood_posts").insert(posts);

  if (error) {
    console.error("❌ Insert failed:", error.message);
    return;
  }

  console.log("✅ 100 Academic posts inserted successfully.");
  console.log("➡ Now run backfill embeddings.");
}

seedAcademic();