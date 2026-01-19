"use client";

import { useState } from "react";

export default function AvatarUpload({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    const res = await fetch("/api/users/avatar", {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      alert("Upload failed");
    } else {
      window.location.reload();
    }
  }

  return (
    <label className="cursor-pointer">
      <input type="file" hidden accept="image/*" onChange={handleUpload} />
      <div className="rounded-full w-24 h-24 bg-gray-200 flex items-center justify-center">
        {loading ? "Uploading..." : "Change Avatar"}
      </div>
    </label>
  );
}
