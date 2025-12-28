"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { getMe } from "../lib/auth";

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profile_image?: string;
};

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState<"EN" | "ES">("EN");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getMe().then((res: User | null) => {
      if (res) setUser(res);
    });
  }, []);

  return (
    <>
      <header className="sticky top-0 z-[9999] h-20 w-full bg-white text-black shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4">
          <Menu className="md:hidden cursor-pointer" />

          <Link href="/">
            <img src="/logo.png" className="h-8 shrink-0 cursor-pointer" />
          </Link>

          <div
            className="hidden md:flex items-center gap-2 text-sm font-semibold whitespace-nowrap cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
            ALL CATEGORIES
          </div>

          <div className="flex flex-1 justify-center px-4">
            <div className="relative w-full max-w-xl">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search here"
                className="w-full rounded-full bg-gray-200 px-5 py-2.5 pr-12 text-sm outline-none"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow">
                <Search size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {!user && (
              <Link
                href="/login"
                className="rounded-full bg-[#0B123A] px-5 py-2 text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            )}

            {user && (
              <Link href="/account">
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200 hover:ring-black transition"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                    {user.firstName?.[0] ?? "U"}
                  </div>
                )}
              </Link>
            )}

            <div
              className="relative h-10 w-10 rounded-full bg-cover bg-center flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => setLang(lang === "EN" ? "ES" : "EN")}
              style={{
                backgroundImage:
                  lang === "EN"
                    ? "url(https://flagcdn.com/w80/gb.png)"
                    : "url(https://flagcdn.com/w80/es.png)",
              }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <span className="relative z-10 text-white font-bold">{lang}</span>
            </div>
            <Link href="/cart">
              {" "}
              <ShoppingCart />
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[9998] bg-black/40 transition-opacity ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 z-[9999] h-full w-80 bg-white shadow-2xl transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-lg font-semibold">All Categories</span>
          <X className="cursor-pointer" onClick={() => setSidebarOpen(false)} />
        </div>

        <div className="h-full p-4" />
      </aside>
    </>
  );
}
