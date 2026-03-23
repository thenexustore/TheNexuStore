"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Mail,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  RefreshCcw,
} from "lucide-react";
import { forgotPassword } from "../lib/auth";
import { loadStoreBranding, subscribeStoreBranding, type StoreBranding } from "../lib/admin-branding";
import StoreBrandLogo from "../components/StoreBrandLogo";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(() => loadStoreBranding());

  useEffect(
    () => subscribeStoreBranding(setStoreBranding, { refreshRemote: false }),
    [],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword({ email });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setError(getErrorMessage(error, t("defaultError")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-black selection:text-white flex items-center justify-center p-6">
      {/* Background Grid */}
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      <div className="w-full max-w-[440px]">
        {/* Back Link */}
        <Link
          href="/login"
          className="group mb-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors"
        >
          <ChevronLeft
            size={14}
            className="group-hover:-translate-x-1 transition-transform"
          />
          {t("backToLogin")}
        </Link>

        {/* The Card */}
        <div className="bg-white border-[3px] border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <form onSubmit={submit} className="space-y-8">
            <StoreBrandLogo
              branding={storeBranding}
              variant="dark"
              alt="Secure Gate"
              className="mx-auto w-auto"
              height={40}
            />
            {error && (
              <div className="bg-red-50 border-2 border-red-500 p-4 flex items-center gap-3 text-red-600 font-black text-[10px] uppercase tracking-widest">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t("emailLabel")}
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-slate-100 bg-slate-50 px-12 py-4 font-bold outline-none focus:border-black focus:bg-white transition-all placeholder:text-slate-300"
                  placeholder={t("emailPlaceholder")}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-black py-5 text-sm font-black uppercase tracking-widest text-white transition-all duration-200 hover:bg-neutral-800 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  <span>{t("transmitting")}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>{t("submit")}</span>
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
