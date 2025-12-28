"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  RefreshCw,
  DollarSign,
  RotateCcw,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Products", href: "/products", icon: Package },
  { name: "Imports", href: "/imports", icon: RefreshCw },
  { name: "Pricing", href: "/pricing", icon: DollarSign },
  { name: "Returns", href: "/returns", icon: RotateCcw },
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

  return (
    <div className="min-h-screen bg-white">
      <div className="lg:hidden p-4">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white">
            <div className="p-4 border-b flex justify-end">
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="p-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center p-3 rounded mb-2 ${
                    pathname === item.href ? "bg-blue-100" : "hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </a>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center w-full p-3 text-red-600 hover:bg-red-50 rounded mt-8"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="hidden lg:flex">
        <div className="w-64 min-h-screen bg-white border-r">
          <nav className="p-4">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center p-3 rounded mb-2 ${
                  pathname === item.href ? "bg-blue-100" : "hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </a>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center w-full p-3 text-red-600 hover:bg-red-50 rounded mt-8"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>

        <div className="flex-1">
          <div className="p-6">{children}</div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
