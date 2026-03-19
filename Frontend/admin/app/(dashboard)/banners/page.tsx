"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/constants";
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface Banner {
  id: string;
  image: string;
  overlay: string;
  align: "left" | "center" | "right";
  title_text: string;
  title_color: string;
  title_size: string;
  title_weight: string;
  title_font: string;
  subtitle_text: string;
  subtitle_color: string;
  subtitle_size: string;
  button_text: string;
  button_link: string;
  button_bg: string;
  button_radius: string;
  button_color: string;
  button_padding: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function BannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setError(null);
      setLoading(true);

      const token = localStorage.getItem("admin_token");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/admin/banners`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("admin_token");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch banners`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to load banners");
      }

      setBanners(data.data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error fetching banners:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteBanner = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this banner? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${API_URL}/admin/banners/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to delete banner");
      }

      setBanners((prev) => prev.filter((banner) => banner.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete banner";
      alert(errorMessage);
      console.error("Error deleting banner:", err);
    }
  };

  const toggleBannerStatus = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `${API_URL}/admin/banners/${id}/toggle-status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to toggle banner status");
      }

      setBanners((prev) =>
        prev.map((banner) =>
          banner.id === id
            ? { ...banner, is_active: !banner.is_active }
            : banner
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to toggle status";
      alert(errorMessage);
      console.error("Error toggling banner status:", err);
    }
  };

  const moveBanner = async (index: number, direction: "up" | "down") => {
    if (reordering) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    setReordering(true);

    try {
      const updatedBanners = [...banners];
      const [movedBanner] = updatedBanners.splice(index, 1);
      updatedBanners.splice(newIndex, 0, movedBanner);

      const reorderedBanners = updatedBanners.map((banner, idx) => ({
        ...banner,
        sort_order: idx + 1,
      }));

      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${API_URL}/admin/banners/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: reorderedBanners.map((b) => b.id),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to reorder banners");
      }

      setBanners(reorderedBanners);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reorder banner";
      alert(errorMessage);
      console.error("Error reordering banner:", err);
      await fetchBanners(); // Refresh to maintain consistency
    } finally {
      setReordering(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-10 bg-slate-200 rounded-lg w-48 animate-pulse" />
          <div className="grid gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 bg-white rounded-2xl border border-slate-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Banners
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Manage your storefront visual experience
            </p>
          </div>
          <Link
            href="/banners/new"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <PlusIcon className="h-5 w-5 mr-2 stroke-[3]" />
            Add Banner
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-800 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button
              onClick={fetchBanners}
              className="text-xs font-bold uppercase tracking-widest hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main List */}
        <div className="grid gap-5">
          {banners.length > 0 ? (
            banners
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((banner, index) => (
                <div
                  key={banner.id}
                  className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300"
                >
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-6">
                    {/* Visual Preview Container */}
                    <div className="relative flex-shrink-0">
                      <div className="w-full lg:w-72 h-44 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/50 shadow-inner">
                        <img
                          src={banner.image || "/placeholder-banner.jpg"}
                          alt=""
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            !banner.is_active ? "grayscale opacity-60" : ""
                          }`}
                        />
                        {!banner.is_active && (
                          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-900 shadow-xl">
                              Inactive
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Floating Order Controls */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-xl border border-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => moveBanner(index, "up")}
                          disabled={index === 0 || reordering}
                          className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                        >
                          <ArrowUpIcon className="h-4 w-4 stroke-[3]" />
                        </button>
                        <div className="h-px bg-slate-100 mx-1" />
                        <button
                          onClick={() => moveBanner(index, "down")}
                          disabled={index === banners.length - 1 || reordering}
                          className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                        >
                          <ArrowDownIcon className="h-4 w-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                            {banner.title_text || "Untitled Banner"}
                          </h3>
                          {banner.is_active && (
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                          )}
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed max-w-2xl">
                          {banner.subtitle_text || "No subtitle provided."}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                        {/* Meta Info */}
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Position
                            </span>
                            <span className="text-sm font-semibold text-slate-700">
                              0{banner.sort_order}
                            </span>
                          </div>
                          <div className="h-8 w-px bg-slate-100" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Alignment
                            </span>
                            <span className="text-sm font-semibold text-slate-700 capitalize">
                              {banner.align}
                            </span>
                          </div>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBannerStatus(banner.id)}
                            className={`p-2.5 rounded-xl transition-all ${
                              banner.is_active
                                ? "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                            title={banner.is_active ? "Deactivate" : "Activate"}
                          >
                            {banner.is_active ? (
                              <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                              <EyeIcon className="h-5 w-5" />
                            )}
                          </button>

                          <Link
                            href={`/banners/${banner.id}/edit`}
                            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            title="Edit Banner"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>

                          <button
                            onClick={() => deleteBanner(banner.id)}
                            className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 mb-4">
                <PlusIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Create your first banner
              </h3>
              <p className="text-slate-500 mt-1 mb-6">
                Your storefront looks a bit empty. Let's add some magic.
              </p>
              <Link
                href="/banners/new"
                className="text-indigo-600 font-bold hover:text-indigo-700"
              >
                Get Started &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Footer Minimal Stats */}
        {banners.length > 0 && (
          <div className="mt-12 flex items-baseline gap-6 border-t border-slate-200 pt-8">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light tracking-tighter text-slate-900">
                {banners.length}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Total
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 self-center" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light tracking-tighter text-emerald-600">
                {banners.filter((b) => b.is_active).length}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">
                Active
              </span>
            </div>
            <div className="ml-auto text-[11px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">
              Last Synced: {formatDate(new Date().toISOString())}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
