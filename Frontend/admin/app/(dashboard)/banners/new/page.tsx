"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BannerForm from "@/app/components/BannerForm";
import { createBanner, CreateBannerData } from "@/lib/api/banners";

export default function NewBannerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data: CreateBannerData) => {
    setIsSubmitting(true);
    setError("");

    try {
      await createBanner(data);
      router.push("/banners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Banner</h1>
        <p className="text-gray-600">Add a new banner to your store</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <BannerForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
