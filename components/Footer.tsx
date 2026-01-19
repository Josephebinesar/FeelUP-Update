"use client";

import Link from "next/link";
import { Heart, Lock, Leaf, Users } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { name: "About FeelUp", href: "/about" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Support", href: "/support" },
    { name: "Community Guidelines", href: "/community-guidelines" },
  ];

  return (
    <footer className="bg-[linear-gradient(180deg,#f8fdff,#ffffff)] border-t border-gray-100 mt-16 soft-glow">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div
                className="logo-img"
                style={{ ["--logo-size" as any]: "36px" }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
              </div>
              <div className="text-xl font-bold text-[var(--brand-black)]">
                Feel<span className="text-[var(--brand-blue)]">Up</span>
              </div>
            </div>
            <p className="text-sm text-[var(--feelup-muted)] mb-4">
              Building a more positive and supportive world through wellness
              tracking and meaningful connections.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-[var(--brand-black)] mb-4">
              Features
            </h3>
            <ul className="space-y-2 text-sm text-[var(--feelup-muted)]">
              <li>
                <Link
                  href="/mood-feed"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Mood Feed
                </Link>
              </li>
              <li>
                <Link
                  href="/goals"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Daily Goals
                </Link>
              </li>
              <li>
                <Link
                  href="/journal"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Wellness Journal
                </Link>
              </li>
              <li>
                <Link
                  href="/analytics"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Analytics
                </Link>
              </li>
              <li>
                <Link
                  href="/community"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-[var(--brand-black)] mb-4">
              Account
            </h3>
            <ul className="space-y-2 text-sm text-[var(--feelup-muted)]">
              <li>
                <Link
                  href="/profile"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Your Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/achievements"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Achievements
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="hover:text-[var(--brand-blue)] transition-colors"
                >
                  Settings
                </Link>
              </li>
              <li>
                <span className="text-[rgba(107,122,137,0.6)]">
                  Premium (Coming Soon)
                </span>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="font-semibold text-[var(--brand-black)] mb-4">
              Support & Legal
            </h3>
            <ul className="space-y-2 text-sm text-[var(--feelup-muted)]">
              {footerLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-[var(--brand-blue)] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-[var(--feelup-muted)] mb-4 md:mb-0 flex items-center gap-2">
            © {currentYear} FeelUp. Made with <Heart className="w-4 h-4 text-red-500" /> for your wellness journey.
          </div>
          <div className="flex items-center space-x-6 text-sm text-[var(--feelup-muted)]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Privacy Focused</span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4" />
              <span>Wellness First</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Community Driven</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
