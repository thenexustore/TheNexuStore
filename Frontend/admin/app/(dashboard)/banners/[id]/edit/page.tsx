"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import BannerForm from "@/app/components/BannerForm";
import {
  getBanner,
  updateBanner,
  CreateBannerData,
  Banner,
} from "@/lib/api/banners";

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [banner, setBanner] = useState<Banner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBanner();
  }, [id]);

  const loadBanner = async () => {
    try {
      const data = await getBanner(id);
      setBanner(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banner");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: CreateBannerData) => {
    setIsSubmitting(true);
    setError("");

    try {
      await updateBanner(id, data);
      router.push("/banners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div>Loading banner...</div>
      </div>
    );
  }

  if (!banner) {
    return (
      <div className="p-6">
        <div className="text-red-600">Banner not found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Banner</h1>
        <p className="text-gray-600">Update banner details</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <BannerForm
        banner={banner}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
