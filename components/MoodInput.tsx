"use client";

import { useEffect, useState } from "react";

const moodOptions = [
  { label: "Happy", emoji: "😊" },
  { label: "Calm", emoji: "😌" },
  { label: "Excited", emoji: "🤩" },
  { label: "Grateful", emoji: "🙏" },
  { label: "Thoughtful", emoji: "🤔" },
  { label: "Sad", emoji: "😔" },
  { label: "Anxious", emoji: "😰" },
  { label: "Tired", emoji: "😴" },
];

export default function MoodInput({
  onSubmit,
}: {
  onSubmit: (data: {
    content: string;
    mood: string | null;
    moodEmoji: string | null;
    anonymous: boolean;
  }) => void;
}) {
  const [text, setText] = useState("");
  const [selectedMood, setSelectedMood] = useState<any>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [detecting, setDetecting] = useState(false);

  /* ---------------- AI DETECTION ---------------- */

  useEffect(() => {
    if (text.trim().length < 2) {
      setSelectedMood(null);
      setConfidence(null);
      return;
    }

    const timer = setTimeout(async () => {
      setDetecting(true);

      try {
        const res = await fetch("/api/detect-mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const data = await res.json();

        console.log("AI response:", data); // 👈 DEBUG (REMOVE LATER)

        if (data?.mood) {
          const mood = moodOptions.find(
            (m) => m.label === data.mood
          );

          if (mood) {
            setSelectedMood(mood);
            setConfidence(
              typeof data.confidence === "number"
                ? data.confidence
                : null
            );
          }
        }
      } catch (err) {
        console.error("Mood detection failed", err);
      } finally {
        setDetecting(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [text]);

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = () => {
    if (!text.trim()) return;

    onSubmit({
      content: text,
      mood: selectedMood?.label ?? null,
      moodEmoji: selectedMood?.emoji ?? null,
      anonymous,
    });

    setText("");
    setSelectedMood(null);
    setConfidence(null);
    setAnonymous(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <textarea
        className="w-full border rounded-lg p-3 mb-2 resize-none"
        placeholder="How are you feeling?"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="text-sm text-gray-500 mb-2 min-h-[22px]">
        {detecting && <span>🧠 Understanding your mood...</span>}

        {!detecting && selectedMood && (
          <span>
            Detected mood:
            <span className="ml-1 font-medium">
              {selectedMood.emoji} {selectedMood.label}
            </span>

            {confidence !== null && (
              <span className="ml-2 text-xs text-gray-400">
                ({confidence}% accurate)
              </span>
            )}
          </span>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm mb-3">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={() => setAnonymous(!anonymous)}
        />
        Post anonymously
      </label>

      <button
        onClick={handleSubmit}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg w-full hover:bg-purple-700"
      >
        Share ✨
      </button>
    </div>
  );
}
