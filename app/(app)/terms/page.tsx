"use client";

import { useState } from "react";
import Link from "next/link";

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("terms");

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-800 mb-4">
            Terms & Conditions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Please read these terms and conditions carefully before using FeelUp
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Navigation Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Quick Navigation
                </h3>
                <nav className="space-y-2">
                  {[
                    { id: "terms", title: "Terms of Service", icon: "📜" },
                    { id: "privacy", title: "Privacy Policy", icon: "🔒" },
                    {
                      id: "wellness",
                      title: "Wellness Disclaimer",
                      icon: "💚",
                    },
                    { id: "conduct", title: "Code of Conduct", icon: "🤝" },
                    { id: "liability", title: "Liability", icon: "⚖️" },
                    { id: "contact", title: "Contact Info", icon: "📞" },
                  ].map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? "bg-purple-100 text-purple-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {section.icon} {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl p-8 shadow-sm">
                {/* Terms of Service */}
                {activeSection === "terms" && (
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                      📜 Terms of Service
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Last updated: December 1, 2025
                    </p>

                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          1. Acceptance of Terms
                        </h3>
                        <p className="text-gray-600">
                          By accessing and using FeelUp ("the Service"), you
                          accept and agree to be bound by the terms and
                          provision of this agreement. If you do not agree to
                          abide by the above, please do not use this service.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          2. Description of Service
                        </h3>
                        <p className="text-gray-600">
                          FeelUp is a wellness and mood tracking platform that
                          provides users with tools to track their emotional
                          wellbeing, connect with supportive communities, and
                          access wellness resources. Our service includes mood
                          logging, analytics, community features, and wellness
                          content.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          3. User Accounts
                        </h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>
                            You must be at least 13 years old to create an
                            account
                          </li>
                          <li>
                            You are responsible for maintaining the
                            confidentiality of your account
                          </li>
                          <li>
                            You must provide accurate and complete information
                            when creating your account
                          </li>
                          <li>
                            You are responsible for all activities that occur
                            under your account
                          </li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          4. Acceptable Use
                        </h3>
                        <p className="text-gray-600 mb-3">
                          You agree not to use the Service to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>Violate any laws or regulations</li>
                          <li>Harass, abuse, or harm other users</li>
                          <li>Share inappropriate or harmful content</li>
                          <li>
                            Attempt to gain unauthorized access to the Service
                          </li>
                          <li>
                            Use the Service for commercial purposes without
                            permission
                          </li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          5. Content and Data
                        </h3>
                        <p className="text-gray-600">
                          You retain ownership of your personal content and
                          data. By using our Service, you grant us a license to
                          use your data to provide and improve our services, as
                          outlined in our Privacy Policy.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {/* Privacy Policy */}
                {activeSection === "privacy" && (
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                      🔒 Privacy Policy
                    </h2>

                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Data We Collect
                        </h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>Account information (email, name)</li>
                          <li>Mood tracking data and journal entries</li>
                          <li>Usage analytics and app interactions</li>
                          <li>Community posts and interactions</li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          How We Use Your Data
                        </h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>Provide personalized wellness insights</li>
                          <li>Improve our services and features</li>
                          <li>Enable community interactions</li>
                          <li>Send important service notifications</li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Data Protection
                        </h3>
                        <p className="text-gray-600">
                          We use industry-standard encryption and security
                          measures to protect your personal information. Your
                          data is stored securely and is never sold to third
                          parties.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {/* Wellness Disclaimer */}
                {activeSection === "wellness" && (
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                      💚 Wellness Disclaimer
                    </h2>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                      <h4 className="text-lg font-semibold text-yellow-800 mb-2">
                        ⚠️ Important Notice
                      </h4>
                      <p className="text-yellow-700">
                        FeelUp is not a substitute for professional mental
                        health care, medical treatment, or therapy.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          What FeelUp Is
                        </h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>A wellness and mood tracking tool</li>
                          <li>A supportive community platform</li>
                          <li>
                            A resource for self-reflection and mindfulness
                          </li>
                          <li>A complement to professional care</li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          What FeelUp Is Not
                        </h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>Professional medical or psychiatric advice</li>
                          <li>A replacement for therapy or counseling</li>
                          <li>Emergency mental health support</li>
                          <li>Diagnostic or treatment services</li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          When to Seek Professional Help
                        </h3>
                        <p className="text-gray-600 mb-3">
                          Please contact a mental health professional if you
                          experience:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>
                            Persistent feelings of sadness or hopelessness
                          </li>
                          <li>Thoughts of self-harm or suicide</li>
                          <li>Severe anxiety or panic attacks</li>
                          <li>Substance abuse issues</li>
                          <li>Any mental health crisis</li>
                        </ul>
                      </section>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-red-800 mb-2">
                          🆘 Crisis Resources
                        </h4>
                        <div className="text-red-700 space-y-1">
                          <p>
                            <strong>Crisis Text Line:</strong> Text HOME to
                            741741
                          </p>
                          <p>
                            <strong>National Suicide Prevention:</strong> 988
                          </p>
                          <p>
                            <strong>Emergency:</strong> 911
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Code of Conduct */}
                {activeSection === "conduct" && (
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                      🤝 Code of Conduct
                    </h2>

                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Community Values
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border-l-4 border-green-500 pl-4">
                            <h4 className="font-semibold text-green-700 mb-2">
                              Respect
                            </h4>
                            <p className="text-gray-600 text-sm">
                              Treat all community members with dignity and
                              kindness
                            </p>
                          </div>
                          <div className="border-l-4 border-blue-500 pl-4">
                            <h4 className="font-semibold text-blue-700 mb-2">
                              Support
                            </h4>
                            <p className="text-gray-600 text-sm">
                              Offer encouragement and understanding to others
                            </p>
                          </div>
                          <div className="border-l-4 border-purple-500 pl-4">
                            <h4 className="font-semibold text-purple-700 mb-2">
                              Privacy
                            </h4>
                            <p className="text-gray-600 text-sm">
                              Respect others' personal information and
                              boundaries
                            </p>
                          </div>
                          <div className="border-l-4 border-pink-500 pl-4">
                            <h4 className="font-semibold text-pink-700 mb-2">
                              Safety
                            </h4>
                            <p className="text-gray-600 text-sm">
                              Help maintain a safe and welcoming environment
                            </p>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Prohibited Behavior
                        </h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                          <li>Harassment, bullying, or intimidation</li>
                          <li>Sharing personal information without consent</li>
                          <li>Spam or excessive promotional content</li>
                          <li>Hate speech or discriminatory language</li>
                          <li>Content promoting self-harm</li>
                          <li>Impersonation or fake accounts</li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Reporting Violations
                        </h3>
                        <p className="text-gray-600">
                          If you encounter behavior that violates our community
                          guidelines, please report it immediately. We review
                          all reports promptly and take appropriate action.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {/* Liability */}
                {activeSection === "liability" && (
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                      ⚖️ Limitation of Liability
                    </h2>

                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Service Availability
                        </h3>
                        <p className="text-gray-600">
                          While we strive to maintain 99.9% uptime, FeelUp is
                          provided "as is" without warranties of any kind. We do
                          not guarantee uninterrupted service.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          User Content
                        </h3>
                        <p className="text-gray-600">
                          Users are solely responsible for their content and
                          interactions. FeelUp is not liable for user-generated
                          content or community interactions.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                          Wellness Information
                        </h3>
                        <p className="text-gray-600">
                          Any wellness information provided is for educational
                          purposes only and should not be considered medical
                          advice. Always consult healthcare professionals for
                          medical concerns.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {/* Contact */}
                {activeSection === "contact" && (
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                      📞 Contact Information
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          General Support
                        </h3>
                        <div className="space-y-2 text-gray-600">
                          <p>📧 support@feelup.com</p>
                          <p>🌐 www.feelup.com/support</p>
                          <p>⏰ Response time: 24 hours</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          Legal Matters
                        </h3>
                        <div className="space-y-2 text-gray-600">
                          <p>📧 legal@feelup.com</p>
                          <p>📮 FeelUp Legal Team</p>
                          <p>📍 123 Wellness Blvd, Suite 100</p>
                          <p>📍 San Francisco, CA 94102</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">
                        Updates to Terms
                      </h4>
                      <p className="text-blue-700">
                        We may update these terms from time to time. Users will
                        be notified of significant changes via email or in-app
                        notification.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-12">
          <Link
            href="/mood-feed"
            className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
