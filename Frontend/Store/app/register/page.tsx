"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { API_URL } from "../lib/env";
import Image from "next/image";
import {
  Camera,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Hash,
} from "lucide-react";
import { registerUser, resendOtp, verifyOtp } from "../lib/auth";
import { loadStoreBranding, subscribeStoreBranding, type StoreBranding } from "../lib/admin-branding";
import StoreBrandLogo from "../components/StoreBrandLogo";
import { useAuth } from "../providers/AuthProvider";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState("register");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(null as any);
  const [otp, setOtp] = useState("");
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(() => loadStoreBranding());
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  useEffect(() => subscribeStoreBranding(setStoreBranding), []);

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const toBase64 = (file: any) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
    });

  const onRegister = async (e: any) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const profile_image = image ? String(await toBase64(image)) : null;
      await registerUser({ ...form, profile_image });
      setStep("verify");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: any) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await verifyOtp({ email: form.email, otp });
      await refreshUser();
      router.replace("/account");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Invalid verification code"));
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading || loading) return;

    setError("");
    setNotice("");
    setResendLoading(true);

    try {
      await resendOtp({ email: form.email });
      setNotice("A new OTP has been sent to your email.");
      setResendCooldown(30);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to resend OTP"));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6 selection:bg-black selection:text-white">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      <div className="w-full max-w-[480px]">
        <div className="flex gap-2 mb-10 justify-center">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              step === "register" ? "w-12 bg-black" : "w-4 bg-slate-200"
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              step === "verify" ? "w-12 bg-indigo-600" : "w-4 bg-slate-200"
            }`}
          />
        </div>

        <div className="bg-white border-[3px] border-black p-6 sm:p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 text-red-600 text-[10px] font-black uppercase tracking-widest whitespace-pre-wrap break-words">
              {error}
            </div>
          )}

          {step === "register" ? (
            <>
              <form onSubmit={onRegister} className="space-y-5">
                <div className="text-center mb-8">
                  <StoreBrandLogo
                    branding={storeBranding}
                    variant="dark"
                    alt="Secure Gate"
                    className="mx-auto w-auto"
                    height={40}
                  />
                </div>

                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-3xl border-[3px] border-black overflow-hidden bg-slate-50">
                      {preview ? (
                        <img
                          src={preview}
                          className="h-full w-full object-cover"
                          alt="Profile"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-200">
                          <User size={40} />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 h-10 w-10 bg-indigo-600 border-2 border-black text-white flex items-center justify-center cursor-pointer hover:bg-black transition-colors">
                      <Camera size={18} />
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => setImage(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    placeholder="FIRST_NAME"
                    required
                    className="w-full border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-black"
                    value={form.first_name}
                    onChange={(e) =>
                      setForm({ ...form, first_name: e.target.value })
                    }
                  />
                  <input
                    placeholder="LAST_NAME"
                    required
                    className="w-full border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-black"
                    value={form.last_name}
                    onChange={(e) =>
                      setForm({ ...form, last_name: e.target.value })
                    }
                  />
                </div>

                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="email"
                    placeholder="NODE_EMAIL"
                    required
                    className="w-full border-2 border-slate-100 bg-slate-50 px-12 py-4 font-bold outline-none focus:border-black"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="password"
                    placeholder="ACCESS_KEY"
                    required
                    className="w-full border-2 border-slate-100 bg-slate-50 px-12 py-4 font-bold outline-none focus:border-black"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="
w-full bg-black py-4 text-xs font-black uppercase tracking-widest text-white
hover:bg-neutral-800
cursor-pointer
transition-all duration-200
active:scale-[0.98]
disabled:opacity-50
flex items-center justify-center gap-2
"
                >
                  {loading ? (
                    "INITIALIZING..."
                  ) : (
                    <>
                      Register <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-black text-slate-300">
                  OR
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <a
                href={`${API_URL}/auth/google`}
                className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 py-4 font-black uppercase tracking-widest hover:bg-slate-50 transition text-xs"
              >
                <Image
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="Google"
                  width={18}
                  height={18}
                />
                Continue_with_Google
              </a>
            </>
          ) : (
            <form onSubmit={onVerify} className="space-y-8">
              <div className="text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-6">
                  <ShieldCheck size={40} />
                </div>
                <h1 className="text-3xl font-[1000] tracking-tighter uppercase italic">
                  Verify_Identity
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-4 italic">
                  Sent to:{" "}
                  <span className="text-black not-italic">{form.email}</span>
                </p>
              </div>

              <div className="relative">
                <Hash
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"
                  size={24}
                />
                <input
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="000000"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 py-8 text-center text-5xl font-[1000] tracking-[12px] outline-none focus:border-black transition-all"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={resendLoading || resendCooldown > 0 || loading}
                  className="text-slate-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading
                    ? "Resending..."
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend OTP"}
                </button>
                {notice && <span className="text-green-600">{notice}</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-5 font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "VERIFYING..." : "Complete_Auth"}
              </button>
            </form>
          )}

          <div className="mt-8 text-center pt-8 border-t border-slate-50">
            <Link
              href="/login"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black"
            >
              Already have an account?{" "}
              <span className="underline underline-offset-4">
                Back to Login
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
