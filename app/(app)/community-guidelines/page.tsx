"use client";

import { useRouter } from "next/navigation";

export default function CommunityGuidelinesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-800 mb-4">
            Community Guidelines
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Creating a safe, supportive space for everyone's wellness journey
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-purple-700 mb-6">
              Our Commitment to You
            </h2>
            <div className="prose prose-lg text-gray-600 space-y-4">
              <p>
                FeelUp is more than just an app—it's a community where people
                come together to support each other's mental health and wellness
                journeys. These guidelines help us maintain a safe, respectful,
                and supportive environment for everyone.
              </p>
              <p>
                By participating in our community, you agree to follow these
                guidelines and help us create a positive space where everyone
                feels valued, heard, and supported.
              </p>
            </div>
          </section>

          {/* Core Principles */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Core Principles
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  Respect & Kindness
                </h3>
                <p className="text-gray-600">
                  Treat everyone with dignity and compassion. We all have
                  different experiences and perspectives.
                </p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-blue-700 mb-2">
                  Privacy & Confidentiality
                </h3>
                <p className="text-gray-600">
                  Respect others' privacy. Don't share personal information
                  without explicit permission.
                </p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  Supportive Environment
                </h3>
                <p className="text-gray-600">
                  Focus on encouragement and support rather than judgment or
                  criticism.
                </p>
              </div>
              <div className="border-l-4 border-pink-500 pl-4">
                <h3 className="text-lg font-semibold text-pink-700 mb-2">
                  Professional Boundaries
                </h3>
                <p className="text-gray-600">
                  Remember that peer support is not professional therapy or
                  medical advice.
                </p>
              </div>
            </div>
          </section>

          {/* Community Standards */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Community Standards
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-3">
                  ✓ Encouraged Behavior
                </h3>
                <ul className="space-y-2 text-gray-600 ml-4">
                  <li>
                    • Share your experiences authentically and thoughtfully
                  </li>
                  <li>• Offer encouragement and support to others</li>
                  <li>• Ask questions and seek help when you need it</li>
                  <li>• Celebrate others' progress and achievements</li>
                  <li>• Use content warnings for sensitive topics</li>
                  <li>• Report concerning behavior to moderators</li>
                  <li>• Respect cultural and individual differences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-red-700 mb-3">
                  ✗ Prohibited Behavior
                </h3>
                <ul className="space-y-2 text-gray-600 ml-4">
                  <li>• Harassment, bullying, or targeted attacks</li>
                  <li>• Sharing others' private information without consent</li>
                  <li>• Providing medical or therapeutic advice</li>
                  <li>• Promoting self-harm or dangerous behaviors</li>
                  <li>• Spam, commercial content, or promotional posts</li>
                  <li>• Hate speech or discriminatory language</li>
                  <li>• Impersonating others or creating fake accounts</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Content Guidelines */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Content Guidelines
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  Sensitive Content
                </h3>
                <p className="text-gray-600 mb-4">
                  When sharing about difficult topics, please use appropriate
                  content warnings:
                </p>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• [CW: Self-harm] for discussions about self-injury</li>
                  <li>• [CW: Suicidal thoughts] for suicidal ideation</li>
                  <li>• [CW: Eating disorders] for food/body image topics</li>
                  <li>• [CW: Trauma] for traumatic experiences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  Crisis Situations
                </h3>
                <p className="text-gray-600 mb-4">
                  If someone expresses immediate danger to themselves or others:
                </p>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• Encourage them to seek professional help</li>
                  <li>• Provide crisis hotline information</li>
                  <li>• Report the post to moderators immediately</li>
                  <li>• Don't attempt to provide therapy or counseling</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Reporting & Moderation */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Reporting & Moderation
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Report Content
                </h3>
                <p className="text-gray-600 text-sm">
                  Use the report button on any post or comment that violates our
                  guidelines.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Ask Questions
                </h3>
                <p className="text-gray-600 text-sm">
                  Contact our support team if you're unsure about our
                  guidelines.
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Follow Up</h3>
                <p className="text-gray-600 text-sm">
                  We'll review all reports within 24 hours and take appropriate
                  action.
                </p>
              </div>
            </div>
          </section>

          {/* Consequences */}
          <section className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Consequences for Violations
            </h2>
            <div className="space-y-4 text-gray-600">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <div>
                  <h4 className="font-semibold text-gray-800">First Warning</h4>
                  <p>
                    Educational message about community guidelines with content
                    removal if necessary.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <div>
                  <h4 className="font-semibold text-gray-800">
                    Temporary Suspension
                  </h4>
                  <p>
                    24-48 hour suspension from community features with mandatory
                    guideline review.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <div>
                  <h4 className="font-semibold text-gray-800">Permanent Ban</h4>
                  <p>
                    Complete removal from community features for repeated or
                    severe violations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Crisis Resources */}
          <section className="bg-red-50 border border-red-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-6">
              Crisis Resources
            </h2>
            <p className="text-red-700 mb-4">
              If you or someone you know is in immediate danger, please contact
              emergency services or these crisis resources:
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-red-800 mb-2">
                  United States
                </h4>
                <ul className="space-y-1 text-red-700">
                  <li>• Crisis Text Line: Text HOME to 741741</li>
                  <li>• National Suicide Prevention: 988</li>
                  <li>• Emergency: 911</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-800 mb-2">
                  International
                </h4>
                <ul className="space-y-1 text-red-700">
                  <li>• Crisis lines vary by country</li>
                  <li>• Contact local emergency services</li>
                  <li>• Visit befrienders.org for local resources</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Questions About Our Guidelines?
            </h2>
            <p className="text-lg mb-6">
              We're here to help clarify any questions you may have about our
              community standards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/support"
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="mailto:community@feelup.com"
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-purple-600 transition-colors"
              >
                Email Community Team
              </a>
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
