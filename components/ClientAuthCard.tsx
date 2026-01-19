"use client";

import { useEffect, useState } from "react";
import AuthCard from "./AuthCard";
import { createBrowserSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ClientAuthCard({
  mode = "signup",
}: {
  mode?: "signup" | "login";
}) {
  const supabase = createBrowserSupabaseClient();
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 🧪 Username validation
  const isValidUsername = (value: string) =>
    /^[a-zA-Z0-9_]{4,20}$/.test(value);

  // 🔐 Signup
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!full_name.trim()) return setError("Full name is required");
    if (!username.trim()) return setError("Username is required");
    if (!isValidUsername(username))
      return setError(
        "Username must be 4–20 characters (letters, numbers, underscore only)"
      );
    if (!acceptTerms)
      return setError("You must accept the terms and conditions");

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            username,
          },
        },
      });

      if (error) throw error;

      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/mood-feed");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="p-6 animate-pulse bg-gray-200 rounded-lg h-64" />
    );
  }

  return (
    <AuthCard
      mode={mode}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      full_name={full_name}
      setFullName={setFullName}
      username={username}
      setUsername={setUsername}
      acceptTerms={acceptTerms}
      setAcceptTerms={setAcceptTerms}
      onRegister={handleRegister}
      onLogin={handleLogin}
      error={error}
      loading={loading}
    />
  );
}
