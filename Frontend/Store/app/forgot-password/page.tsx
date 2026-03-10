"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
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

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(() => loadStoreBranding());

  useEffect(() => subscribeStoreBranding(setStoreBranding), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword({ email });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch {
      setError("SIGNAL_ERROR: FAILED_TO_TRANSMIT_OTP");
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
          Back_to_Gate
        </Link>

        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-[1000] tracking-tighter uppercase italic leading-none">
            Recover_Access
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">
            Requesting OTP Transmission to Node
          </p>
        </div>

        {/* The Card */}
        <div className="bg-white border-[3px] border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          {/* Subtle Decorative Element */}
          <div className="absolute top-0 right-0 p-2 opacity-5 font-mono text-[8px] leading-none pointer-events-none">
            RECOVERY_PROTOCOL_v2.0
            <br />
            SECURE_CHANNEL_ACTIVE
          </div>

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
                Registered_Email
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
                  placeholder="verify_node@nexus.io"
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic">
                * An encrypted One-Time Password will be dispatched to this
                address.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-black py-5 text-sm font-black uppercase tracking-widest text-white transition-all duration-200 hover:bg-neutral-800 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  <span>TRANSMITTING...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Send OTP</span>
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Support Meta */}
        <div className="mt-12 flex justify-between items-center opacity-30 text-[9px] font-black uppercase tracking-[0.3em]">
          <span>Ref: RC-99</span>
          <span className="animate-pulse">Waiting_for_input...</span>
        </div>
      </div>
    </div>
  );
}
