"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full px-8 py-4 flex items-center justify-between border-b">
      <div className="text-xl font-extrabold tracking-tight">
        NEXUS
      </div>

      <div className="flex gap-6 text-sm font-semibold">
        <Link href="/account">Account</Link>
        <Link href="/login">Login</Link>
      </div>
    </nav>
  );
}
