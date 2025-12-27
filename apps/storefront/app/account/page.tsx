"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Power, 
  Fingerprint, 
  Activity, 
  Mail, 
  Calendar, 
  ChevronLeft, 
  ShieldCheck,
  Hash,
  Globe,
  Clock
} from "lucide-react";
import { getMe, logoutUser } from "../lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(res => {
      if (!res) return router.replace("/login");
      setUser(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="grid h-screen place-items-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-100 border-t-indigo-600" />
        <span className="font-mono text-[10px] tracking-[0.5em] text-slate-400 uppercase">System_Initialising</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-black selection:text-white">
      {/* Dynamic Grid Background */}
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <main className="mx-auto max-w-7xl p-6 md:p-12 lg:p-20">
        
        {/* Top Navigation */}
        <div className="mb-16 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white transition-all hover:scale-110 hover:border-black active:scale-95 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 underline underline-offset-4">Server: DX-77_EUROPE</span>
            </div>
            <button 
              onClick={() => logoutUser().then(() => router.push("/login"))}
              className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-black px-8 py-3 text-xs font-bold uppercase tracking-tighter text-white transition-all hover:bg-red-600"
            >
              <Power size={14} className="group-hover:rotate-12 transition-transform" />
              <span>Terminate_Session</span>
            </button>
          </div>
        </div>

        {/* Profile Architecture */}
        <div className="grid gap-12 lg:grid-cols-12">
          
          {/* Left Side: The "Hero" Identity */}
          <div className="lg:col-span-5">
            <div className="relative aspect-square w-full max-w-[400px] overflow-hidden rounded-[4rem] bg-slate-100 ring-1 ring-slate-200 shadow-2xl shadow-slate-200/50">
              {user?.profile_image ? (
                <img src={user.profile_image} className="h-full w-full object-cover" alt="Profile" referrerPolicy="no-referrer"/>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-700 text-[120px] font-black text-white">
                  {user?.firstName?.[0]}
                </div>
              )}
              {/* Online Overlay */}
              <div className="absolute bottom-10 left-10 flex items-center gap-3 rounded-2xl bg-white/80 p-4 backdrop-blur-md border border-white shadow-xl">
                 <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                 <span className="text-xs font-black uppercase tracking-tighter">Status: Authorized</span>
              </div>
            </div>

            <div className="mt-12">
              <h1 className="text-7xl font-[1000] leading-[0.8] tracking-[-0.07em] text-slate-900 md:text-9xl">
                {user?.firstName} <br />
                <span className="text-slate-300">{user?.lastName}</span>
              </h1>
              <div className="mt-8 flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-3">
                  <Mail size={20} className="text-slate-400" />
                </div>
                <span className="text-lg font-bold text-slate-500 tracking-tight">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Data Modules */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* ID Module */}
            <div className="group relative overflow-hidden rounded-[3rem] border border-slate-100 bg-[#fcfcfc] p-10 transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
                    <Fingerprint size={28} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Identity_Verification</span>
               </div>
               <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-600 uppercase">Global_UID</span>
                  <p className="font-mono text-2xl font-black tracking-tighter text-slate-900 truncate uppercase">{user?.id}</p>
               </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
               {/* Time Module */}
               <div className="rounded-[3rem] border border-slate-100 bg-white p-10 shadow-sm transition-all hover:scale-[1.02]">
                  <div className="mb-6 text-slate-300"><Clock size={32} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last_Activity</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase">{user?.lastLoginAt ? new Date(user.lastLoginAt).toDateString() : 'New Session'}</p>
               </div>

               {/* Origin Module */}
               <div className="rounded-[3rem] border border-slate-100 bg-white p-10 shadow-sm transition-all hover:scale-[1.02]">
                  <div className="mb-6 text-slate-300"><Calendar size={32} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registry_Date</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 uppercase">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '2024'}
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Infrastructure Member</p>
               </div>
            </div>

            {/* Security Action Module */}
            <div className="mt-auto flex flex-col items-center justify-between gap-8 rounded-[3.5rem] bg-indigo-600 p-10 text-white shadow-2xl shadow-indigo-200 md:flex-row">
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-xl">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">Security_Node</h3>
                  <p className="text-indigo-100 font-medium opacity-80">Encryption protocols active.</p>
                </div>
              </div>
              <button className="w-full rounded-full bg-white px-10 py-5 text-sm font-black uppercase tracking-widest text-indigo-600 transition-all hover:bg-black hover:text-white md:w-auto">
                Manage_2FA
              </button>
            </div>

          </div>
        </div>

        {/* Footer Meta */}
        <footer className="mt-32 flex flex-col items-center justify-between gap-6 border-t border-slate-100 pt-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 md:flex-row">
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><Globe size={12}/> Global_Node</span>
            <span className="flex items-center gap-2"><Hash size={12}/> Ver: 2.0.8</span>
          </div>
          <span>&copy; Nexus_Cloud_Systems_2025</span>
        </footer>

      </main>
    </div>
  );
}