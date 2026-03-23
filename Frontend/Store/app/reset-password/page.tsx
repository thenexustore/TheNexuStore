"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Lock,
  Key,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import { resetPassword } from "../lib/auth";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

// Next.js requires useSearchParams to be wrapped in a Suspense boundary
function ResetForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ email, otp, password });
      setSuccess(true);
      setTimeout(() => {
        router.replace("/login");
      }, 3000);
    } catch (error) {
      setError(getErrorMessage(error, t("defaultError")));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-[440px] text-center">
        <div className="bg-white border-[3px] border-black p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
          <CheckCircle2 size={64} className="text-green-500 mb-6" />
          <h2 className="text-2xl font-[1000] uppercase italic mb-2">
            {t("successTitle")}
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("successSubtitle")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[440px]">
      <Link
        href="/forgot-password"
        className="group mb-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors"
      >
        <ChevronLeft
          size={14}
          className="group-hover:-translate-x-1 transition-transform"
        />
        {t("back")}
      </Link>

      <div className="bg-white border-[3px] border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <form onSubmit={submit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-500 p-4 flex items-center gap-3 text-red-600 font-black text-[10px] uppercase tracking-widest">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("otpLabel")}
            </label>
            <div className="relative">
              <Key
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full border-2 border-slate-100 bg-slate-50 px-12 py-4 font-bold outline-none focus:border-black focus:bg-white transition-all"
                placeholder="XXXXXX"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("newPasswordLabel")}
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-slate-100 bg-slate-50 px-12 py-4 font-bold outline-none focus:border-black focus:bg-white transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("confirmPasswordLabel")}
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-2 border-slate-100 bg-slate-50 px-12 py-4 font-bold outline-none focus:border-black focus:bg-white transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full bg-black py-5 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-green-600 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <RefreshCcw className="h-4 w-4 animate-spin" />
                <span>{t("syncing")}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>{t("submit")}</span>
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// THE DEFAULT EXPORT
export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-black selection:text-white flex items-center justify-center p-6">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      {/* Suspense is required when using useSearchParams in Next.js 13+ app router */}
      <Suspense
        fallback={
          <div className="font-black animate-pulse">
            {t("loading")}
          </div>
        }
      >
        <ResetForm />
      </Suspense>
    </div>
  );
}
