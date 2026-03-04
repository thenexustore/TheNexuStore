"use client";

import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutTemplate,
  MessageCircle,
  Ticket,
  Tags,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "products", href: "/products", icon: Package },
  { key: "orders", href: "/orders", icon: ShoppingCart },
  { key: "coupons", href: "/coupons", icon: Ticket },
  { key: "pricing", href: "/pricing", icon: Tags },
  { key: "chat", href: "/chat", icon: MessageCircle },
  {
    key: "homeContent",
    icon: LayoutTemplate,
    children: [
      { key: "banners", href: "/banners" },
      { key: "homepageSections", href: "/homepage-sections" },
      { key: "homeBuilder", href: "/home-builder" },
      { key: "featuredProducts", href: "/featured-products" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/login");
  };

  const NavItems = () => (
    <div className="space-y-1.5 px-4">
      {navigation.map((item) => {
        const isParentActive = item.children?.some(
          (sub) => pathname === sub.href
        );
        const isOpen = openMenu === item.key || isParentActive;
        const isActive = pathname === item.href;

        if (item.children) {
          return (
            <div key={item.key}>
              <button
                onClick={() =>
                  setOpenMenu(isOpen && !isParentActive ? null : item.key)
                }
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-xl transition ${
                  isParentActive
                    ? "bg-black text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-black"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-5 h-5 ${
                      isParentActive ? "text-white" : "text-zinc-400"
                    }`}
                  />
                  {t(item.key)}
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 ml-6 pl-4 border-l border-zinc-200 space-y-1">
                      {item.children.map((sub) => (
                        <Link
                          key={sub.key}
                          href={sub.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`block px-4 py-2 text-sm rounded-lg transition ${
                            pathname === sub.href
                              ? "bg-zinc-900 text-white"
                              : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
                          }`}
                        >
                          {t(sub.key)}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition ${
              isActive
                ? "bg-black text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-black"
            }`}
          >
            <item.icon
              className={`w-5 h-5 ${isActive ? "text-white" : "text-zinc-400"}`}
            />
            {t(item.key)}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 bg-white border-b z-30">
        <img src="/logo.png" className="h-7" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.replace(pathname, { locale: locale === "en" ? "es" : "en" })}
            className="px-3 py-1 text-xs rounded-full border border-zinc-300"
          >
            {locale.toUpperCase()}
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-zinc-100 rounded-full"
          >
            <Menu className="w-6 h-6 text-zinc-700" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className="hidden lg:flex w-72 bg-white border-r border-zinc-200 flex-col">
        <div className="h-20 flex items-center px-8">
          <img src="/logo.png" className="h-8" />
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <NavItems />
        </nav>
        <div className="p-4 border-t border-zinc-200">
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-zinc-400 group-hover:text-red-600" />
            {t("logout")}
          </button>
        </div>
      </aside>

      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 z-50 flex flex-col lg:hidden"
      >
        <div className="h-20 flex items-center px-8">
          <img src="/logo.png" className="h-8" />
          <button className="ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <NavItems />
        </nav>
        <div className="p-4 border-t border-zinc-200">
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-zinc-400 group-hover:text-red-600" />
            {t("logout")}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pt-16 lg:pt-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-50">{children}</div>
      </main>
    </div>
  );
}
