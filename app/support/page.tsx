"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Shield, Users, Wrench, Send, CheckCircle, AlertTriangle, Phone } from "lucide-react";

export default function SupportPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "general",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-800 mb-4">
            Support Center
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're here to help you get the most out of FeelUp. Find answers or
            get in touch with our support team.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* FAQ Section */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Help */}
              <section className="bg-white rounded-xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Quick Help
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-semibold text-purple-700 mb-2">
                      Getting Started
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Learn the basics of mood tracking and setting up your
                      profile.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-semibold text-purple-700 mb-2">
                      Privacy & Security
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Understand how we protect your personal information.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-semibold text-purple-700 mb-2">
                      Community Guidelines
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Learn about our community standards and best practices.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-semibold text-purple-700 mb-2">
                      Troubleshooting
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Resolve common issues and technical problems.
                    </p>
                  </div>
                </div>
              </section>

              {/* FAQ */}
              <section className="bg-white rounded-xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      How do I track my mood?
                    </h3>
                    <p className="text-gray-600">
                      Simply tap the mood tracking button on your dashboard and
                      select how you're feeling. You can add notes, tags, and
                      context to better understand your emotional patterns over
                      time.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Is my data private and secure?
                    </h3>
                    <p className="text-gray-600">
                      Yes! We take your privacy seriously. All your personal
                      data is encrypted and we never share your information with
                      third parties. You have full control over what you share
                      in community spaces.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Can I export my mood data?
                    </h3>
                    <p className="text-gray-600">
                      Absolutely! Go to Settings → Data Export to download your
                      mood history, journal entries, and analytics in a standard
                      format that you can use with other tools.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      How do I delete my account?
                    </h3>
                    <p className="text-gray-600">
                      If you need to delete your account, go to Settings →
                      Account → Delete Account. This will permanently remove all
                      your data from our servers. You can also contact support
                      for assistance.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Is FeelUp a replacement for therapy?
                    </h3>
                    <p className="text-gray-600">
                      No, FeelUp is a wellness tool designed to complement, not
                      replace, professional mental health care. If you're
                      experiencing severe mental health issues, please consult
                      with a licensed healthcare provider.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Contact Form */}
            <div className="space-y-6">
              <section className="bg-white rounded-xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Contact Support
                </h2>

                {submitted ? (
                  <div className="text-center py-8">
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Message Sent!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Thank you for reaching out. We'll get back to you within
                      24 hours.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="input-field w-full"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="input-field w-full"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Subject
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="input-field w-full"
                      >
                        <option value="general">General Question</option>
                        <option value="technical">Technical Issue</option>
                        <option value="account">Account Help</option>
                        <option value="privacy">Privacy Concern</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={5}
                        className="input-field w-full resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </button>
                  </form>
                )}
              </section>

              {/* Emergency Support */}
              <section className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-3">
                  Need Immediate Help?
                </h3>
                <p className="text-red-700 text-sm mb-4">
                  If you're experiencing a mental health emergency, please
                  contact:
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong className="text-red-800">Crisis Text Line:</strong>
                    <span className="text-red-700"> Text HOME to 741741</span>
                  </div>
                  <div>
                    <strong className="text-red-800">
                      National Suicide Prevention:
                    </strong>
                    <span className="text-red-700"> 988</span>
                  </div>
                  <div>
                    <strong className="text-red-800">Emergency:</strong>
                    <span className="text-red-700"> 911</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
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
