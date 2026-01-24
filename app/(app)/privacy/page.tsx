"use client";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 soft-glow">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔒 Privacy Policy
          </h1>

          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Our Privacy Commitment
              </h2>
              <p className="text-gray-700 leading-relaxed">
                At FeelUp, your privacy is our top priority. We believe that
                your wellness journey is personal, and we're committed to
                protecting your data while providing you with meaningful
                insights and connections.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Information We Collect
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">
                    Account Information
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Email, name, and profile details you provide during
                    registration.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Wellness Data</h3>
                  <p className="text-gray-700 text-sm">
                    Mood posts, goals, journal entries, and analytics data you
                    create.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    Usage Information
                  </h3>
                  <p className="text-gray-700 text-sm">
                    How you interact with our platform to improve your
                    experience.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                How We Use Your Data
              </h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>
                  Provide personalized wellness insights and recommendations
                </li>
                <li>Enable community features and connections</li>
                <li>Improve our platform and user experience</li>
                <li>Send you relevant updates and support</li>
                <li>Ensure platform safety and security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Your Data Rights
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>✓ Access your data at any time through your profile</li>
                  <li>✓ Export your wellness data in standard formats</li>
                  <li>✓ Delete your account and all associated data</li>
                  <li>✓ Control what data is shared publicly</li>
                  <li>✓ Opt out of data processing for marketing</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Data Sharing & Third Parties
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We never sell your personal data. We only share data in these
                limited circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>
                  When you choose to share mood posts or comments publicly
                </li>
                <li>
                  With trusted service providers who help operate our platform
                </li>
                <li>If required by law or to protect user safety</li>
                <li>
                  In anonymized, aggregated form for research (with your
                  consent)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Security Measures
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We use industry-standard security measures including encryption,
                secure data storage, regular security audits, and access
                controls to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Data Retention
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your data only as long as necessary to provide our
                services. You can delete your account at any time, and we'll
                remove your data within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Contact Us
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have questions about this privacy policy or your data,
                please contact us at privacy@feelup.app or through our support
                channels.
              </p>
            </section>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
              <p className="text-green-800 text-center font-medium mb-2">
                🌱 Your Wellness, Your Data, Your Choice
              </p>
              <p className="text-green-700 text-center text-sm">
                We're committed to transparency and giving you full control over
                your wellness data.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
