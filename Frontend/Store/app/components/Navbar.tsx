"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu, Search, ShoppingCart, MessageCircle, X } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useCart } from "../../context/CartContext";
import { getMe } from "../lib/auth";
import { productAPI, Product, CategorySearchResult, CategoryTreeNode } from "../lib/products";
import { CategoryDrawer } from "./CategoryDrawer";
import { buildCuratedCategoryTree } from "../lib/category-navigation";
import { loadStoreBranding, subscribeStoreBranding, type StoreBranding } from "../lib/admin-branding";
import StoreBrandLogo from "./StoreBrandLogo";

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profile_image?: string;
};

type NavbarCategory = {
  id: string;
  name: string;
  slug: string;
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
  const [desktopMegaOpen, setDesktopMegaOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySearchResults, setCategorySearchResults] = useState<CategorySearchResult[]>([]);
  const [categorySearchLoading, setCategorySearchLoading] = useState(false);
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(() => loadStoreBranding());
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const curatedCategoryTree = useMemo(
    () => buildCuratedCategoryTree(categoryTreeState),
    [categoryTreeState],
  );
  const filteredCategories = curatedCategoryTree;

  // Use context providers
  const { user: authUser, logout } = useAuth();
  const { cartCount, isLoading: cartLoading } = useCart();

  // Legacy cart count for backward compatibility
  const [legacyCartCount, setLegacyCartCount] = useState(0);

  useEffect(() => {
    // Load user from API
    getMe().then((res: User | null) => {
      if (res) setUser(res);
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
      setUser({
        id: authUser.id,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
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
      console.error("Failed to load categories tree:", error);
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
    router.push(`/products?categories=${categorySlug}`);
    closeMobilePanels();
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
      } finally {
        setCategorySearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [categorySearch]);

  const displayCartCount = cartLoading ? legacyCartCount : cartCount;

  return (
    <>
      <header className="sticky top-0 z-50 min-h-20 w-full border-b border-gray-200 bg-white text-black">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
          <button
            onClick={() => setCategoryPanelOpen((v) => !v)}
            className="md:hidden cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>

          <Link href="/" className="min-w-0 flex-shrink-0">
            <div className="flex h-10 w-24 items-center justify-center rounded-lg sm:w-32">
              <StoreBrandLogo branding={storeBranding} alt="logo" className="h-8 w-auto" height={32} />
            </div>
          </Link>

          <div className="hidden md:block">
            <button
              onClick={() => setCategoryPanelOpen(true)}
              className="hidden md:flex items-center gap-2 text-sm font-medium whitespace-nowrap cursor-pointer px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-haspopup="dialog"
              aria-expanded={categoryPanelOpen}
            >
              <Menu size={18} />
              {t("allCategories")}
            </button>
          </div>

          <div className="order-3 w-full basis-full md:order-none md:basis-auto md:flex-1 md:px-2" ref={searchRef}>
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full md:mx-auto md:max-w-xl"
            >
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => search.length >= 2 && setShowSearchResults(true)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-lg bg-gray-50 border border-gray-300 px-5 py-3 pr-12 text-sm outline-none focus:border-[#0B123A] focus:ring-2 focus:ring-[#0B123A]/20 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[#0B123A] p-2 text-white hover:bg-[#1a245a] transition-colors"
              >
                <Search size={18} />
              </button>

              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-300 z-[9999]">
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
                            {t("productsFound", {count: searchResults.length})}
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
                                {product.compare_at_price && product.compare_at_price > product.price && (
                                  <span className="absolute left-1 top-1 z-10 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                                    -{Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}%
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
                                        product.compare_at_price && product.compare_at_price > product.price
                                          ? "text-red-600"
                                          : "text-[#0B123A]"
                                      }`}
                                    >
                                      €{product.price.toFixed(2)}
                                    </p>
                                    {product.compare_at_price && product.compare_at_price > product.price && (
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

          <div className="ml-auto flex max-w-full items-center gap-1.5 shrink-0 sm:gap-2">
            <Link
              href="/chat"
              onClick={closeMobilePanels}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              title={t("supportChat")}
            >
              <MessageCircle className="w-5 h-5 text-gray-700" />
            </Link>
            {!user ? (
              <div className="hidden items-center gap-2 md:flex md:gap-3">
                <Link
                  href="/login"
                  onClick={closeMobilePanels}
                  className="text-sm font-medium whitespace-nowrap text-gray-700 hover:text-[#0B123A] transition-colors"
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobilePanels}
                  className="rounded-lg bg-[#0B123A] px-3 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-[#1a245a] transition-colors sm:px-4"
                >
                  {t("signUp")}
                </Link>
              </div>
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
                      {user.firstName?.[0] ?? "U"}
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
              <span className="relative z-10 text-xs font-bold text-white">{locale.toUpperCase()}</span>
            </button>

            <Link
              href="/cart"
              onClick={closeMobilePanels}
              className="relative rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ShoppingCart className="h-5 w-5 text-gray-700 sm:h-6 sm:w-6" />
              {displayCartCount > 0 && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white sm:text-xs">
                  {displayCartCount > 9 ? "9+" : displayCartCount}
                </div>
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
        open={categoryPanelOpen}
        loading={categoriesLoading}
        tree={curatedCategoryTree}
        query={categorySearch}
        searchResults={categorySearchResults}
        searchLoading={categorySearchLoading}
        onQueryChange={setCategorySearch}
        onClose={() => setCategoryPanelOpen(false)}
        onNavigate={handleCategoryClick}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[90vw] max-w-80 bg-white shadow-xl transform transition-transform duration-300 sm:w-[86vw] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-black">{t("categories")}</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-black"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder={t("searchCategories")}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0B123A]/20 focus:border-[#0B123A] text-black placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="h-[calc(100vh-144px)] overflow-y-auto">
          <div className="p-4">
            {categoriesLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B123A]"></div>
              </div>
            ) : filteredCategories.length > 0 ? (
              <div className="space-y-1">
                {filteredCategories.map((category: NavbarCategory) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.slug)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-[#0B123A] transition-colors font-medium flex justify-between items-center cursor-pointer"
                  >
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
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
