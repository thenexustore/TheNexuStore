"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logoutUser, updateProfile } from "../lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    profile_image: "",
  });

  const [address, setAddress] = useState({
    company: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    region: "",
    country: "",
    phone: "",
    is_default: false,
  });

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setProfile((p) => ({ ...p, profile_image: base64 }));
  };

  useEffect(() => {
    getMe().then((res) => {
      if (!res) return router.replace("/login");
      setUser(res);
      setProfile({
        first_name: res.firstName || "",
        last_name: res.lastName || "",
        profile_image: res.profile_image || "",
      });
      if (res.address) {
        setAddress({
          company: res.address.company || "",
          address_line1: res.address.address_line1 || "",
          address_line2: res.address.address_line2 || "",
          city: res.address.city || "",
          postal_code: res.address.postal_code || "",
          region: res.address.region || "",
          country: res.address.country || "",
          phone: res.address.phone || "",
          is_default: res.address.is_default || false,
        });
      }
    });
  }, [router]);

  const handleSave = async () => {
    setLoading(true);
    await updateProfile({ profile, address });
    const fresh = await getMe();
    setUser(fresh);
    setEdit(false);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900 pb-20">
      <div className="mx-auto max-w-4xl p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your profile and shipping information.</p>
          </div>
          <div className="flex items-center gap-3">
            {!edit ? (
              <button
                onClick={() => setEdit(true)}
                className="btn btn-primary"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEdit(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  onClick={handleSave}
                  className="btn btn-primary"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
            <button
              onClick={() => logoutUser().then(() => router.push("/login"))}
              className="btn btn-danger"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Basic Info */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border bg-white p-6 text-center">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <img
                  src={profile.profile_image || "https://ui-avatars.com/api/?name=" + profile.first_name}
                  alt="profile"
                  className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-sm"
                />
                {edit && (
                  <label className="absolute bottom-0 right-0 p-1 bg-white border rounded-full cursor-pointer shadow-sm hover:bg-gray-50">
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </label>
                )}
              </div>
              <h2 className="font-semibold text-lg">{profile.first_name} {profile.last_name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50">
                <h3 className="font-semibold text-slate-800">Personal Details</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="label">First Name</label>
                  <input
                    disabled={!edit}
                    className="input"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Last Name</label>
                  <input
                    disabled={!edit}
                    className="input"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="label text-slate-400">Email Address (Locked)</label>
                  <input disabled className="input bg-gray-50 cursor-not-allowed opacity-70" value={user.email} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50">
                <h3 className="font-semibold text-slate-800">Shipping Address</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="label">Company</label>
                  <input disabled={!edit} className="input" placeholder="Company Name" value={address.company} onChange={(e) => setAddress({ ...address, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Phone</label>
                  <input disabled={!edit} className="input" placeholder="+1..." value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="label">Street Address</label>
                  <input disabled={!edit} className="input" placeholder="Address Line 1" value={address.address_line1} onChange={(e) => setAddress({ ...address, address_line1: e.target.value })} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <input disabled={!edit} className="input" placeholder="Suite, Apt, etc. (Optional)" value={address.address_line2} onChange={(e) => setAddress({ ...address, address_line2: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">City</label>
                  <input disabled={!edit} className="input" placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Postal Code</label>
                  <input disabled={!edit} className="input" placeholder="Postal Code" value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Region / State</label>
                  <input disabled={!edit} className="input" placeholder="Region" value={address.region} onChange={(e) => setAddress({ ...address, region: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Country</label>
                  <input disabled={!edit} className="input" placeholder="Country" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          transition: all 0.2s;
          background-color: #fff;
        }
        .input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .input:disabled {
          background-color: #fcfcfc;
          border-color: #f1f5f9;
        }
        .label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-primary {
          background-color: #000;
          color: #fff;
        }
        .btn-primary:hover {
          background-color: #262626;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-outline {
          border: 1px solid #e2e8f0;
          background: white;
        }
        .btn-outline:hover {
          background: #f8fafc;
        }
        .btn-danger {
          background-color: #ef4444;
          color: white;
        }
        .btn-danger:hover {
          background-color: #dc2626;
        }
      `}</style>
    </div>
  );
}