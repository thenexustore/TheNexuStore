"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

interface ReviewFormProps {
  onSubmit: (reviewData: {
    rating: number;
    title?: string;
    comment?: string;
  }) => Promise<void>;
  productId?: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit }) => {
  const t = useTranslations("products");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setRatingError(false);

    if (rating < 1 || rating > 5) {
      setRatingError(true);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      setRating(0);
      setHovered(0);
      setTitle("");
      setComment("");
      setSuccessMessage(t("reviewSuccess"));
    } catch {
      setErrorMessage(t("reviewFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hovered || rating;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{t("writeReview")}</h3>

      {successMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4" role="alert">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-sm font-medium text-red-800">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {t("reviewRating")}
          </label>
          <div className="flex gap-1" role="radiogroup" aria-label={t("reviewRating")}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                aria-pressed={rating === star}
                onClick={() => {
                  setRating(star);
                  setRatingError(false);
                }}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="text-3xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B123A] focus-visible:rounded"
              >
                <span className={displayRating >= star ? "text-amber-400" : "text-slate-200"}>
                  ★
                </span>
              </button>
            ))}
          </div>
          {ratingError && (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {t("reviewRatingRequired")}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="review-title" className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t("reviewTitle")}
          </label>
          <input
            type="text"
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-[#0B123A] focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
            placeholder={t("reviewTitlePlaceholder")}
            maxLength={100}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="review-comment" className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t("reviewComment")}
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-[#0B123A] focus:outline-none focus:ring-1 focus:ring-[#0B123A]"
            placeholder={t("reviewCommentPlaceholder")}
            rows={4}
            maxLength={1000}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{comment.length}/1000</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#0B123A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a245a] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t("reviewSubmitting") : t("reviewSubmit")}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;
