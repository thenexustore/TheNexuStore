"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/login");
  };

  const NavItems = () => (
    <div className="space-y-1 px-3">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
            }`}
          >
            <item.icon
              className={`w-5 h-5 mr-3 transition-colors ${
                isActive
                  ? "text-blue-600"
                  : "text-slate-400 group-hover:text-slate-900"
              }`}
            />
            {item.name}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src="./logo.png" alt="logo" />
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-slate-50 z-50 lg:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="./logo.png" alt="logo" />
                </div>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto">
                <NavItems />
              </nav>
              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-slate-50 border-r border-slate-200">
          <div className="p-8 mb-4">
            <div className="flex items-center gap-3">
              <img src="./logo.png" alt="logo" />
            </div>
          </div>

          <nav className="flex-1">
            <NavItems />
          </nav>

          <div className="p-4 mt-auto">
            <div className="bg-white p-1 rounded-2xl border border-slate-200 mb-4">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full py-2 px-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
