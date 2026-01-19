"use client";

import { Dispatch, SetStateAction } from "react";

type Props = {
  mode?: "login" | "signup";

  email: string;
  setEmail: Dispatch<SetStateAction<string>>;

  password: string;
  setPassword: Dispatch<SetStateAction<string>>;

  full_name: string;
  setFullName: Dispatch<SetStateAction<string>>;

  username: string;
  setUsername: Dispatch<SetStateAction<string>>;

  acceptTerms: boolean;
  setAcceptTerms: Dispatch<SetStateAction<boolean>>;

  onRegister: (e: React.FormEvent) => void;
  onLogin?: (e: React.FormEvent) => void;

  error: string;
  loading: boolean;
};

export default function AuthCard({
  mode = "signup",

  email,
  setEmail,
  password,
  setPassword,
  full_name,
  setFullName,
  username,
  setUsername,
  acceptTerms,
  setAcceptTerms,

  onRegister,
  onLogin,

  error,
  loading,
}: Props) {
  const isSignup = mode === "signup";

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-5">
      <h2 className="text-2xl font-bold text-center">
        {isSignup ? "Create your FeelUp account" : "Welcome back to FeelUp"}
      </h2>

      <form
        onSubmit={isSignup ? onRegister : onLogin}
        className="space-y-4"
      >
        {/* FULL NAME (Signup only) */}
        {isSignup && (
          <input
            type="text"
            placeholder="Full name"
            className="input-field"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}

        {/* USERNAME (Signup only) */}
        {isSignup && (
          <input
            type="text"
            placeholder="Username"
            className="input-field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* TERMS (Signup only) */}
        {isSignup && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <a href="/terms" className="underline">
                terms
              </a>{" "}
              &{" "}
              <a href="/privacy" className="underline">
                privacy policy
              </a>
            </span>
          </label>
        )}

        {/* ERROR */}
        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-black text-white hover:bg-gray-900 transition disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : isSignup
            ? "Create Account"
            : "Login"}
        </button>
      </form>

      {/* SWITCH MODE */}
      <div className="text-center text-sm">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => (window.location.href = "/login")}
              className="underline"
            >
              Login
            </button>
          </>
        ) : (
          <>
            Don’t have an account?{" "}
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="underline"
            >
              Create Account
            </button>
          </>
        )}
      </div>
    </div>
  );
}
