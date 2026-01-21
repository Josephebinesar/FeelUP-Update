"use client";

import { useRouter } from "next/navigation";
import ClientAuthCard from "@/components/ClientAuthCard";

export default function SignupPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 items-center">
        {/* LEFT: BRAND / MESSAGE */}
        <div className="hidden md:block">
          <h1 className="text-4xl font-bold text-purple-800 leading-tight">
            Welcome to FeelUp 🌱
          </h1>

          <p className="mt-4 text-gray-700 text-lg">
            A safe space to track moods, reflect, grow, and connect —
            without pressure or judgment.
          </p>

          <ul className="mt-6 space-y-3 text-gray-600">
            <li>🧠 Track moods & emotional patterns</li>
            <li>🤝 Share safely with friends or circles</li>
            <li>🌱 Grow through gentle challenges</li>
            <li>💬 Support & be supported</li>
          </ul>

          <p className="mt-8 text-sm text-gray-500">
            Already part of FeelUp?
          </p>

          <button
            onClick={() => router.push("/login")}
            className="mt-2 inline-block text-purple-700 font-semibold hover:underline"
          >
            Sign in instead →
          </button>
        </div>

        {/* RIGHT: SIGNUP CARD */}
        <div className="w-full">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Create your account
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Start your wellness journey today
              </p>
            </div>

            {/* SIGNUP MODE */}
            <ClientAuthCard mode="signup" />

            <p className="text-xs text-gray-500 text-center mt-6">
              By signing up, you agree to our{" "}
              <a href="/terms" className="underline hover:text-purple-600">
                Terms
              </a>{" "}
              &{" "}
              <a href="/privacy" className="underline hover:text-purple-600">
                Privacy Policy
              </a>
            </p>

            <p className="text-sm text-center mt-4 text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-purple-700 font-semibold hover:underline"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
