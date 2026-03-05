"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "../lib/env";
import { Mail, ArrowRight, AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import { loginUser } from "../lib/auth";
import { loadStoreBranding, subscribeStoreBranding, type StoreBranding } from "../lib/admin-branding";
import StoreBrandLogo from "../components/StoreBrandLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [storeBranding, setStoreBranding] = useState<StoreBranding>(() => loadStoreBranding());

  useEffect(() => subscribeStoreBranding(setStoreBranding), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await loginUser({ email, password });
      router.push("/store");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[400px]">
        <div className="bg-white border-[3px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6 text-center">
            <StoreBrandLogo
              branding={storeBranding}
              variant="dark"
              alt="Secure Gate"
              className="mx-auto w-auto"
              height={40}
            />
            <h1 className="sr-only">Secure Gate</h1>
            <p className="sr-only">Identity Verification</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="bg-red-50 border-2 border-red-500 p-3 flex items-center gap-2 text-red-600 text-[11px] font-black uppercase"
              >
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full border-2 border-slate-200 bg-slate-50 px-12 py-3 font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-black transition-all disabled:opacity-60"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-slate-500">
                  Access Key
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full border-2 border-slate-200 bg-slate-50 px-12 py-3 font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-black transition-all disabled:opacity-60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
              {loading ? "Verifying..." : "Enter System"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-slate-100 flex flex-col gap-4">
            <a
              href={`${API_URL}/auth/google`}
              className="flex items-center justify-center gap-3 border-2 border-slate-200 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 hover:border-black transition-colors"
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                className="h-4 w-4"
              />
              Google Login
            </a>

            <p className="text-[11px] font-bold text-slate-400 text-center">
              New here?{" "}
              <Link href="/register" className="text-black underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
