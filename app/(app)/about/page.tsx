"use client";

import { useRouter } from "next/navigation";
import { Heart, Shield, TrendingUp, ArrowLeft, Mail } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-800 mb-4">
            About FeelUp
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your personal wellness companion for emotional growth and mindful
            living
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Our Story */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Our Story</h2>
            <div className="prose prose-lg text-gray-600 space-y-4">
              <p>
                FeelUp was born from a simple belief: everyone deserves a safe,
                supportive space to explore their emotions and cultivate mental
                wellness. In a world that often moves too fast, we created a
                platform that encourages you to slow down, check in with
                yourself, and celebrate your emotional journey.
              </p>
              <p>
                Our app combines the power of mood tracking with community
                support, helping you understand your emotional patterns while
                connecting with others who share similar experiences. Whether
                you're seeking personal growth, stress management, or simply a
                moment of mindfulness, FeelUp is here to support you.
              </p>
            </div>
          </section>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8">
            <section className="bg-white rounded-xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-purple-700 mb-4">
                Our Mission
              </h2>
              <p className="text-gray-600">
                To democratize mental wellness by providing accessible,
                evidence-based tools that help people understand their emotions,
                build resilience, and create lasting positive change in their
                lives.
              </p>
            </section>

            <section className="bg-white rounded-xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-purple-700 mb-4">
                Our Vision
              </h2>
              <p className="text-gray-600">
                A world where emotional wellness is prioritized, mental health
                resources are accessible to everyone, and communities support
                each other's growth with empathy and understanding.
              </p>
            </section>
          </div>

          {/* Core Values */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Our Values
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Empathy
                </h3>
                <p className="text-gray-600 text-sm">
                  We approach every interaction with understanding and
                  compassion.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Trust
                </h3>
                <p className="text-gray-600 text-sm">
                  Your data and emotions are safe with us - privacy is
                  paramount.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Growth
                </h3>
                <p className="text-gray-600 text-sm">
                  We believe in the power of continuous learning and
                  self-improvement.
                </p>
              </div>
            </div>
          </section>

          {/* Team */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Our Team</h2>
            <div className="text-gray-600 space-y-4">
              <p>
                FeelUp is built by a diverse team of mental health advocates,
                technologists, and designers who are passionate about creating
                positive change in the world. We combine expertise in
                psychology, user experience, and technology to build tools that
                truly make a difference.
              </p>
              <p>
                Our team includes licensed therapists, data scientists, and
                engineers who work together to ensure that every feature we
                build is grounded in research and designed with user wellbeing
                as the top priority.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Get In Touch</h2>
              <p className="text-lg mb-6">
                Have questions, feedback, or just want to say hello? We'd love
                to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/support"
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Contact Support
                </a>
                <a
                  href="mailto:hello@feelup.com"
                  className="border-2 border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-purple-600 transition-colors"
                >
                  Email Us
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push("/mood-feed")}
            className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
