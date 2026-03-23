"use client";

import { useEffect, useState } from "react";
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
  Truck,
  Settings,
  FileText,
  Map,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadAdminSettings,
  saveAdminSettings,
  subscribeAdminSettings,
  type AdminSettings,
} from "@/lib/admin-settings";
import AdminBrandLogo from "@/app/components/AdminBrandLogo";

type StaffUser = {
  email: string;
  role: string;
  name?: string;
  permissions?: string[];
};

type NavChild = {
  key: string;
  href: string;
  requiredPermissions?: string[];
};

type NavParentItem = {
  key: string;
  icon: LucideIcon;
  children: NavChild[];
  requiredPermissions?: never;
  href?: never;
};

type NavLinkItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  children?: never;
};

type NavItem = NavParentItem | NavLinkItem;

const navigation: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "products", href: "/products", icon: Package, requiredPermissions: ["inventory:read"] },
  { key: "orders", href: "/orders", icon: ShoppingCart, requiredPermissions: ["orders:read"] },
  { key: "billing", href: "/billing", icon: FileText, requiredPermissions: ["full_access"] },
  { key: "imports", href: "/imports", icon: Truck, requiredPermissions: ["imports:run", "imports:retry"] },
  { key: "rmas", href: "/rmas", icon: Package, requiredPermissions: ["orders:read", "orders:update"] },
  { key: "coupons", href: "/coupons", icon: Ticket, requiredPermissions: ["full_access"] },
  { key: "pricing", href: "/pricing", icon: Tags, requiredPermissions: ["full_access"] },
  { key: "chat", href: "/chat", icon: MessageCircle, requiredPermissions: ["full_access"] },
  { key: "siteMap", href: "/site-map", icon: Map },
  { key: "settings", href: "/settings", icon: Settings, requiredPermissions: ["full_access"] },
  {
    key: "homeContent",
    icon: LayoutTemplate,
    children: [
      { key: "homeComposer", href: "/home-composer", requiredPermissions: ["full_access"] },
    ],
  },
];

function loadStoredStaffUser(): StaffUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem("admin_user");
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

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
  const [dashboardSettings, setDashboardSettings] = useState<AdminSettings>(() => loadAdminSettings());
  const [staffUser] = useState<StaffUser | null>(() => loadStoredStaffUser());

  useEffect(() => subscribeAdminSettings(setDashboardSettings), []);

  useEffect(() => {
    if (dashboardSettings.adminLanguage !== locale) {
      router.replace(pathname, { locale: dashboardSettings.adminLanguage });
    }
  }, [dashboardSettings.adminLanguage, locale, pathname, router]);

  const userPermissions = Array.isArray(staffUser?.permissions)
    ? staffUser.permissions.map((permission) => String(permission))
    : null;

  const hasAccess = (requiredPermissions?: string[]) => {
    if (!userPermissions) {
      return true;
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    if (userPermissions.includes("full_access")) {
      return true;
    }

    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );
  };

  const filteredNavigation = navigation
    .map((item) => {
      if (item.children) {
        const allowedChildren = item.children.filter((sub) =>
          hasAccess(sub.requiredPermissions)
        );

        if (allowedChildren.length === 0) {
          return null;
        }

        return { ...item, children: allowedChildren };
      }

      return hasAccess(item.requiredPermissions) ? item : null;
    })
    .filter((item): item is NavItem => item !== null);

  // Build avatar initials from name or email
  const avatarInitials = (() => {
    const src = staffUser?.name || staffUser?.email || "";
    const parts = src.trim().split(/[\s@.]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() || "A";
  })();

  // Derive the current page label from the nav tree
  const currentPageLabel = (() => {
    for (const item of filteredNavigation) {
      if (item.href && pathname === item.href) return t(item.key);
      if (item.children) {
        const match = item.children.find((sub) => pathname === sub.href);
        if (match) return `${t(item.key)} › ${t(match.key)}`;
      }
    }
    return null;
  })();

  const toggleAdminLanguage = () => {
    const nextLocale = locale === "en" ? "es" : "en";
    saveAdminSettings({ ...dashboardSettings, adminLanguage: nextLocale });
    router.replace(pathname, { locale: nextLocale });
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.push("/login");
  };

  const renderNavItems = () => (
    <div className="space-y-1.5 px-4">
      {filteredNavigation.map((item) => {
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
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 bg-white border-b z-30">
        <AdminBrandLogo settings={dashboardSettings} className="w-auto" height={26} />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAdminLanguage}
            className="px-2.5 py-1 text-xs rounded-full border border-zinc-200 text-zinc-600"
          >
            {locale.toUpperCase()}
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-zinc-100 rounded-full"
          >
            <Menu className="w-5 h-5 text-zinc-700" />
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

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex ${dashboardSettings.compactSidebar ? "w-64" : "w-72"} bg-white border-r border-zinc-100 flex-col`}
      >
        <div className="h-20 flex items-center px-8 gap-3 border-b border-zinc-50">
          <AdminBrandLogo settings={dashboardSettings} className="w-auto" height={32} />
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {renderNavItems()}
        </nav>
        {/* User info + logout */}
        <div className="border-t border-zinc-100">
          {staffUser && (
            <div className="px-4 pt-3 pb-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate leading-tight">
                  {staffUser.name || staffUser.email}
                </p>
                <p className="text-xs text-zinc-400 truncate leading-tight capitalize">
                  {staffUser.role?.toLowerCase().replace(/_/g, " ") ?? "admin"}
                </p>
              </div>
            </div>
          )}
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={handleLogout}
              className="group w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 group-hover:text-red-600" />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile slide-over sidebar */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 w-72 bg-white border-r border-zinc-100 z-50 flex flex-col lg:hidden"
      >
        <div className="h-16 flex items-center px-6 border-b border-zinc-50">
          <AdminBrandLogo settings={dashboardSettings} className="w-auto" height={28} />
          <button className="ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {renderNavItems()}
        </nav>
        <div className="border-t border-zinc-100">
          {staffUser && (
            <div className="px-4 pt-3 pb-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">
                  {staffUser.name || staffUser.email}
                </p>
                <p className="text-xs text-zinc-400 truncate capitalize">
                  {staffUser.role?.toLowerCase().replace(/_/g, " ") ?? "admin"}
                </p>
              </div>
            </div>
          )}
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={handleLogout}
              className="group w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 group-hover:text-red-600" />
              {t("logout")}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pt-16 lg:pt-0">
        {/* Desktop top bar: breadcrumb + language toggle */}
        <div className="hidden lg:flex h-14 items-center justify-between px-8 bg-white border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="font-medium text-zinc-800">
              {currentPageLabel ?? "Panel"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAdminLanguage}
              className="px-3 py-1.5 text-xs rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition font-medium"
            >
              {locale === "en" ? "EN → ES" : "ES → EN"}
            </button>
            {staffUser && (
              <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-100">
                <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">
                  {avatarInitials}
                </div>
                <span className="text-sm text-zinc-700 font-medium hidden xl:block">
                  {staffUser.name || staffUser.email.split("@")[0]}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-50">{children}</div>
      </main>
    </div>
  );
}
