"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  ShoppingCart,
  MessageCircle,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useCart } from "../../context/CartContext";
import { getMe } from "../lib/auth";
import {
  productAPI,
  Product,
  CategorySearchResult,
  CategoryTreeNode,
} from "../lib/products";
import { CategoryDrawer } from "./CategoryDrawer";
import { CategorySearchResultCard } from "./CategorySearchResultCard";
import {
  findCategoryTrailBySlug,
  normalizeCategoryTree,
  resolveCategoryScopeSlug,
} from "../lib/category-navigation";
import {
  loadStoreBranding,
  subscribeStoreBranding,
  type StoreBranding,
} from "../lib/admin-branding";
import StoreBrandLogo from "./StoreBrandLogo";

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_image?: string;
};

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [categoryTreeState, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySearchResults, setCategorySearchResults] = useState<
    CategorySearchResult[]
  >([]);
  const [categorySearchLoading, setCategorySearchLoading] = useState(false);
  const [mobileCategoryPath, setMobileCategoryPath] = useState<string[]>([]);
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(() =>
    loadStoreBranding(),
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("nav");
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileCategorySearchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const canonicalCategoryTree = useMemo(
    () => normalizeCategoryTree(categoryTreeState),
    [categoryTreeState],
  );
  const filteredCategories = canonicalCategoryTree;
  const activeCategorySlug =
    searchParams.get("category") ||
    searchParams.get("categories")?.split(",")[0] ||
    null;
  const activeCategoryTrail = useMemo(
    () => findCategoryTrailBySlug(canonicalCategoryTree, activeCategorySlug),
    [canonicalCategoryTree, activeCategorySlug],
  );
  const activeMobilePath = useMemo(() => {
    const path: CategoryTreeNode[] = [];
    let level = canonicalCategoryTree;

    for (const id of mobileCategoryPath) {
      const matched = level.find((item) => item.id === id);
      if (!matched) break;
      path.push(matched);
      level = matched.children;
    }

    return path;
  }, [canonicalCategoryTree, mobileCategoryPath]);
  const activeMobileNode = activeMobilePath[activeMobilePath.length - 1];
  const visibleMobileTreeCategories =
    activeMobileNode?.children ?? filteredCategories;
  const visibleMobileCategoryCount =
    categorySearch.trim().length >= 2
      ? categorySearchResults.length
      : visibleMobileTreeCategories.length;

  // Use context providers
  const { user: authUser, logout } = useAuth();
  const { cartCount, isLoading: cartLoading } = useCart();

  // Legacy cart count for backward compatibility
  const [legacyCartCount, setLegacyCartCount] = useState(0);

  useEffect(() => {
    // Load user from API
    getMe()
      .then((res: User | null) => {
        if (res) setUser(res);
      })
      .catch((error) => {
        console.warn("Failed to load user:", error);
      });

    loadCategoryTree();

    // Legacy cart count loading (for backward compatibility)
    const loadLegacyCartCount = () => {
      const stored = localStorage.getItem("cart");
      if (stored) {
        try {
          const cart = JSON.parse(stored);
          const totalItems = cart.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0,
          );
          setLegacyCartCount(totalItems);
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadLegacyCartCount();

    const handleCartUpdate = () => {
      loadLegacyCartCount();
    };

    window.addEventListener("cart-update", handleCartUpdate);
    return () => window.removeEventListener("cart-update", handleCartUpdate);
  }, []);

  useEffect(() => subscribeStoreBranding(setStoreBranding), []);

  useEffect(() => {
    if (authUser) {
      const firstName = authUser.firstName ?? (authUser as User).first_name;
      const lastName = authUser.lastName ?? (authUser as User).last_name;

      setUser({
        id: authUser.id,
        firstName,
        lastName,
        first_name: (authUser as User).first_name,
        last_name: (authUser as User).last_name,
        email: authUser.email,
        profile_image: authUser.profile_image,
      });
    } else {
      setUser(null);
    }
  }, [authUser]);

  const loadCategoryTree = async () => {
    try {
      setCategoriesLoading(true);
      const response = await productAPI.getCategoryTree(5);
      setCategoryTree(response.items ?? []);
    } catch (error) {
      console.warn("Failed to load categories tree. Showing empty menu.", error);
      setCategoryTree([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await productAPI.searchProducts(query, 5);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => {
        handleSearch(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/products?search=${encodeURIComponent(search)}`);
      setShowSearchResults(false);
      setSearch("");
    }
  };

  const closeMobilePanels = () => {
    setCategoryPanelOpen(false);
    setSidebarOpen(false);
    setShowSearchResults(false);
    setCategorySearch("");
    setCategorySearchResults([]);
    setCategorySearchLoading(false);
    setMobileCategoryPath([]);
  };

  const handleProductClick = (product: Product) => {
    router.push(`/products/${product.slug}`);
    closeMobilePanels();
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) {
      router.push(`/products?search=${encodeURIComponent(search)}`);
      setShowSearchResults(false);
      setSearch("");
    }
    if (e.key === "Escape") {
      setShowSearchResults(false);
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    router.push(
      `/products?category=${encodeURIComponent(resolveCategoryScopeSlug({ slug: categorySlug }))}`,
    );
    closeMobilePanels();
  };

  const handleMobileCategorySelect = (category: CategoryTreeNode) => {
    if (category.children.length > 0) {
      setMobileCategoryPath((current) => [...current, category.id]);
      return;
    }

    handleCategoryClick(category.slug);
  };

  const handleMobileCategoryBack = () => {
    setMobileCategoryPath((current) => current.slice(0, -1));
  };

  const handleMobileCategoryJump = (index: number) => {
    setMobileCategoryPath((current) => current.slice(0, index + 1));
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  useEffect(() => {
    if (categorySearch.trim().length < 2) {
      setCategorySearchResults([]);
      setCategorySearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCategorySearchLoading(true);
      try {
        const results = await productAPI.searchCategories(categorySearch, 5);
        setCategorySearchResults(results);
      } catch (error) {
        console.warn("Failed to search categories:", error);
        setCategorySearchResults([]);
      } finally {
        setCategorySearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [categorySearch]);

  useEffect(() => {
    if (categorySearch.trim().length >= 2) {
      setMobileCategoryPath([]);
    }
  }, [categorySearch]);

  useEffect(() => {
    if (!sidebarOpen) return;

    if (categorySearch.trim().length < 2 && activeCategoryTrail.length > 0) {
      setMobileCategoryPath(activeCategoryTrail.map((item) => item.id));
    }

    const timer = window.setTimeout(() => {
      mobileCategorySearchRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [sidebarOpen, categorySearch, activeCategoryTrail]);

  useEffect(() => {
    if (!mobileCategoryPath.length) return;
    if (activeMobilePath.length === mobileCategoryPath.length) return;
    setMobileCategoryPath(activeMobilePath.map((item) => item.id));
  }, [activeMobilePath, mobileCategoryPath]);

  const displayCartCount = cartLoading ? legacyCartCount : cartCount;

  const userInitial = (
    (user?.firstName ?? user?.first_name ?? user?.email ?? "U")
      .trim()
      .charAt(0) || "U"
  ).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 glass text-black shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0B123A] via-indigo-600 to-[#0B123A]" />
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 md:min-h-[74px] md:flex-nowrap md:gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>

          <Link href="/" className="min-w-0 flex-shrink-0">
            <div className="flex h-11 w-24 items-center justify-center rounded-lg sm:w-32">
              <StoreBrandLogo
                branding={storeBranding}
                alt="logo"
                className="h-8 w-auto"
                height={32}
              />
            </div>
          </Link>

          <div className="hidden shrink-0 md:block">
            <button
              onClick={() => setCategoryPanelOpen(true)}
              className="hidden h-11 min-w-max shrink-0 md:flex items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors hover:bg-gray-100"
              aria-haspopup="dialog"
              aria-expanded={categoryPanelOpen}
            >
              <Menu size={18} />
              {t("allCategories")}
            </button>
          </div>

          <div
            className="order-3 w-full basis-full md:order-none md:basis-auto md:flex-1 md:min-w-0 md:px-1"
            ref={searchRef}
          >
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full md:mx-auto md:max-w-xl lg:max-w-2xl"
            >
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => search.length >= 2 && setShowSearchResults(true)}
                placeholder={t("searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-0 pr-12 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#0B123A] text-white transition-colors hover:bg-[#1a245a]"
              >
                <Search size={18} />
              </button>

              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden">
                  <div className="max-h-[70vh] overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0B123A] mx-auto"></div>
                        <p className="mt-2 text-sm">{t("searching")}</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        <div className="p-3 border-b border-gray-100 bg-gray-50 sticky top-0">
                          <p className="text-sm font-medium text-gray-700">
                            {t("productsFound", {
                              count: searchResults.length,
                            })}
                          </p>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {searchResults.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                            >
                              <div className="relative h-14 w-14 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                {product.compare_at_price &&
                                  product.compare_at_price > product.price && (
                                    <span className="absolute left-1 top-1 z-10 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                                      -
                                      {Math.round(
                                        ((product.compare_at_price -
                                          product.price) /
                                          product.compare_at_price) *
                                          100,
                                      )}
                                      %
                                    </span>
                                  )}
                                <img
                                  src={
                                    product.thumbnail &&
                                    product.thumbnail.trim() !== ""
                                      ? product.thumbnail
                                      : "/No_Image_Available.png"
                                  }
                                  alt={product.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src =
                                      "/No_Image_Available.png";
                                  }}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {product.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {product.brand_name}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`text-sm font-extrabold ${
                                        product.compare_at_price &&
                                        product.compare_at_price > product.price
                                          ? "text-red-600"
                                          : "text-[#0B123A]"
                                      }`}
                                    >
                                      €{product.price.toFixed(2)}
                                    </p>
                                    {product.compare_at_price &&
                                      product.compare_at_price >
                                        product.price && (
                                        <p className="text-xs text-black/70 line-through">
                                          €{product.compare_at_price.toFixed(2)}
                                        </p>
                                      )}
                                  </div>
                                  {product.rating_avg && (
                                    <div className="flex items-center text-xs text-gray-600">
                                      <span className="text-yellow-400">★</span>
                                      <span className="ml-1">
                                        {product.rating_avg.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="p-3 border-t border-gray-100 bg-gray-50 sticky bottom-0">
                          <button
                            onClick={() => {
                              router.push(
                                `/products?search=${encodeURIComponent(search)}`,
                              );
                              setShowSearchResults(false);
                              setSearch("");
                            }}
                            className="w-full text-center text-sm font-medium text-[#0B123A] hover:text-[#1a245a] py-2 flex items-center justify-center gap-2"
                          >
                            {t("viewAllResults")}
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : search.length >= 2 ? (
                      <div className="p-6 text-center">
                        <div className="text-gray-400 mb-2">
                          <svg
                            className="w-12 h-12 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-700 font-medium">
                          {t("noResults")}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {t("tryKeywords")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 self-center sm:gap-2 md:gap-3">
            <Link
              href="/chat"
              onClick={closeMobilePanels}
              className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
              title={t("supportChat")}
            >
              <MessageCircle className="w-5 h-5 text-gray-700" />
            </Link>
            {!user ? (
              <>
                <Link
                  href="/login"
                  onClick={closeMobilePanels}
                  className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 md:hidden"
                  title={t("signIn")}
                >
                  <User className="h-5 w-5 text-gray-700" />
                </Link>
                <div className="hidden items-center gap-2 md:flex md:gap-3">
                  <Link
                    href="/login"
                    onClick={closeMobilePanels}
                    className="whitespace-nowrap text-sm font-medium text-gray-700 transition-colors hover:text-[#0B123A]"
                  >
                    {t("signIn")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobilePanels}
                    className="flex h-11 items-center rounded-lg bg-[#0B123A] px-3 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[#1a245a] sm:px-4"
                  >
                    {t("signUp")}
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/account" onClick={closeMobilePanels}>
                  {user.profile_image ? (
                    <img
                      src={user.profile_image}
                      className="h-9 w-9 rounded-full object-cover border-2 border-gray-200 hover:border-[#0B123A] transition-colors"
                      referrerPolicy="no-referrer"
                      alt="Profile"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B123A] text-sm font-bold text-white hover:bg-[#1a245a] transition-colors">
                      {userInitial}
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-700 hover:text-[#0B123A] transition-colors hidden md:block"
                >
                  {t("logout")}
                </button>
              </div>
            )}

            <button
              className="flex h-9 min-w-10 items-center justify-center rounded-lg border border-gray-200 px-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 sm:hidden"
              onClick={() => {
                const nextLocale = locale === "en" ? "es" : "en";
                router.replace(pathname, { locale: nextLocale });
              }}
              aria-label={
                locale === "en" ? "Cambiar a español" : "Switch to English"
              }
            >
              {locale.toUpperCase()}
            </button>

            <button
              className="relative hidden h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-cover bg-center transition-opacity hover:opacity-90 sm:flex sm:h-10 sm:w-10"
              onClick={() => {
                const nextLocale = locale === "en" ? "es" : "en";
                router.replace(pathname, { locale: nextLocale });
              }}
              style={{
                backgroundImage:
                  locale === "en"
                    ? "url(https://flagcdn.com/w80/gb.png)"
                    : "url(https://flagcdn.com/w80/es.png)",
              }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <span className="relative z-10 text-xs font-bold text-white">
                {locale.toUpperCase()}
              </span>
            </button>

            <Link
              href="/cart"
              onClick={closeMobilePanels}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-slate-100"
            >
              <ShoppingCart className="h-5 w-5 text-slate-700 sm:h-6 sm:w-6" />
              {displayCartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                  {displayCartCount > 9 ? "9+" : displayCartCount}
                </span>
              )}
              {cartLoading && displayCartCount === 0 && (
                <div className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#0B123A]"></div>
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      <CategoryDrawer
        key={
          categoryPanelOpen ? "category-drawer-open" : "category-drawer-closed"
        }
        open={categoryPanelOpen}
        loading={categoriesLoading}
        tree={canonicalCategoryTree}
        query={categorySearch}
        searchResults={categorySearchResults}
        searchLoading={categorySearchLoading}
        onQueryChange={setCategorySearch}
        onClose={closeMobilePanels}
        onNavigate={handleCategoryClick}
        activeCategorySlug={activeCategorySlug}
      />

      {sidebarOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobilePanels}
          aria-label={t("closeMenu")}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[88vw] max-w-80 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out sm:w-[80vw] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-black">{t("categories")}</h2>
          <button
            onClick={closeMobilePanels}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-black"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              ref={mobileCategorySearchRef}
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder={t("searchCategories")}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0B123A]/20 focus:border-[#0B123A] text-black placeholder:text-gray-500"
            />
            {categorySearch ? (
              <button
                type="button"
                onClick={() => setCategorySearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label={t("clearSearch")}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="h-[calc(100vh-144px)] overflow-y-auto">
          <div className="p-4">
            {categoriesLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B123A]"></div>
              </div>
            ) : visibleMobileCategoryCount > 0 ? (
              categorySearch.trim().length >= 2 ? (
                <div className="space-y-2">
                  {categorySearchResults.map((category) => (
                    <CategorySearchResultCard
                      key={category.id}
                      item={category}
                      onClick={handleCategoryClick}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeMobileNode ? (
                    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleMobileCategoryBack}
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-[#0B123A]"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t("back")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobileCategoryPath([])}
                          className="text-xs font-medium text-slate-500 hover:text-[#0B123A]"
                        >
                          {t("home")}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        {t("currentPath")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeMobilePath.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleMobileCategoryJump(index)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-[#0B123A] hover:text-[#0B123A]"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCategoryClick(activeMobileNode.slug)
                        }
                        className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-[#0B123A] transition-colors hover:border-[#0B123A]"
                      >
                        {t("viewAllInCategory", {
                          name: activeMobileNode.name,
                        })}
                      </button>
                      <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                        {t("mobileBrowseHint")}
                      </p>
                    </div>
                  ) : null}

                  {visibleMobileTreeCategories.map((category) => {
                    const isCurrentCategory =
                      activeCategorySlug === category.slug;

                    return (
                      <div
                        key={category.id}
                        className={`flex items-center gap-2 rounded-lg border bg-white p-1 ${isCurrentCategory ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleMobileCategorySelect(category)}
                          className={`flex flex-1 items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors ${isCurrentCategory ? "bg-indigo-50 text-[#0B123A]" : "text-gray-700 hover:bg-gray-50 hover:text-[#0B123A]"}`}
                        >
                          <span className="min-w-0">
                            <span className="block">{category.name}</span>
                            {category.children.length > 0 ? (
                              <span className="mt-1 block text-xs font-normal text-slate-500">
                                {t("exploreSubcategories", {
                                  count: category.children.length,
                                })}
                              </span>
                            ) : (
                              <span className="mt-1 block text-xs font-normal text-slate-500">
                                {t("viewProducts")}
                              </span>
                            )}
                          </span>
                          {category.children.length > 0 ? (
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCategoryClick(category.slug)}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${isCurrentCategory ? "border-indigo-300 bg-indigo-50 text-[#0B123A]" : "border-slate-200 text-slate-600 hover:border-[#0B123A] hover:text-[#0B123A]"}`}
                          aria-label={t("viewProductsOf", {
                            name: category.name,
                          })}
                        >
                          {t("view")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                {categorySearch
                  ? t("noCategoriesFound")
                  : t("noCategoriesAvailable")}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
