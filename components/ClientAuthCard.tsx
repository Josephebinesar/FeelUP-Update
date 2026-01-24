"use client";

import { useEffect, useMemo, useState } from "react";
import AuthCard from "./AuthCard";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

function routeByEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  if (e.endsWith("@admin.feelup")) return "/admin";
  if (e.endsWith("@psychologist.feelup")) return "/psychologist";
  return "/mood-feed";
}

function isStaffEmail(email?: string | null) {
  const e = (email || "").toLowerCase().trim();
  return e.endsWith("@admin.feelup") || e.endsWith("@psychologist.feelup");
}

export default function ClientAuthCard({
  mode = "signup",
}: {
  mode?: "signup" | "login";
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);

  // 🔐 Auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [full_name, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setIsClient(true), []);

  // 🧪 Username validation
  const isValidUsername = (value: string) => /^[a-zA-Z0-9_]{4,20}$/.test(value);

  // normalize
  const normalizedUsername = username.trim().toLowerCase();

  // ✅ IMPORTANT: staff cannot sign up
  const effectiveMode: "signup" | "login" =
    mode === "signup" && isStaffEmail(email) ? "login" : mode;

  // 🔐 Signup (ONLY for normal users)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanName = full_name.trim();
    const cleanEmail = email.trim();

    // block staff signup
    if (isStaffEmail(cleanEmail)) {
      setError("This email is not allowed to create an account here.");
      return;
    }

    if (!cleanName) return setError("Full name is required");
    if (!normalizedUsername) return setError("Username is required");
    if (!isValidUsername(normalizedUsername)) {
      return setError(
        "Username must be 4–20 characters (letters, numbers, underscore only)"
      );
    }
    if (!acceptTerms) return setError("You must accept the terms and conditions");

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            username: normalizedUsername,
          },
        },
      });

      if (error) throw error;

      // ✅ send to login after signup
      router.push("/login");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Login (redirect based on email domain)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      const to = routeByEmail(data.user?.email);
      router.replace(to);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <AuthCard
      mode={effectiveMode}
      email={email}
      setEmail={(v) => {
        setError("");
        setEmail(v);
      }}
      password={password}
      setPassword={(v) => {
        setError("");
        setPassword(v);
      }}
      full_name={full_name}
      setFullName={(v) => {
        setError("");
        setFullName(v);
      }}
      username={username}
      setUsername={(v) => {
        setError("");
        setUsername(v);
      }}
      acceptTerms={acceptTerms}
      setAcceptTerms={(v) => {
        setError("");
        setAcceptTerms(v);
      }}
      onRegister={handleRegister}
      onLogin={handleLogin}
      error={error}
      loading={loading}
    />
  );
}
