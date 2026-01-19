"use client";

import Link from "next/link";
import { MessageCircle, Bell, PlusSquare, User } from "lucide-react";

export default function Topbar() {
  return (
    <div className="hidden md:flex items-center gap-3">
      <Link href="/messages" className="p-2 hover:bg-gray-100 rounded-lg">
        <MessageCircle className="w-5 h-5 text-gray-600" />
      </Link>

      <Link href="/notifications" className="relative p-2 hover:bg-gray-100 rounded-lg">
        <Bell className="w-5 h-5 text-gray-600" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
          3
        </span>
      </Link>

      <Link
        href="/create"
        className="p-2 rounded-lg bg-blue-600 text-white"
      >
        <PlusSquare className="w-5 h-5" />
      </Link>

      <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-lg">
        <User className="w-5 h-5 text-gray-600" />
      </Link>
    </div>
  );
}
