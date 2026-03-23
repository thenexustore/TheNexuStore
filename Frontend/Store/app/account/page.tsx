"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { getMe, updateProfile } from "../lib/auth";
import { getOrders, downloadInvoicePdf, Order } from "../lib/checkout";
import { useAuth } from "../providers/AuthProvider";

export default function AccountPage() {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  const [user, setUser] = useState(null as any);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

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

  const fileToBase64 = (file: any) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleImageUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = String(await fileToBase64(file));
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
      // Load customer orders
      setOrdersLoading(true);
      getOrders()
        .then((data) => setOrders(data ?? []))
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    });
  }, [router]);

  const handleDownloadInvoice = async (docId: string) => {
    setDownloadingDoc(docId);
    try {
      await downloadInvoicePdf(docId);
    } catch {
      // silently ignore — browser will show native error if any
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleSave = async () => {
    if (loading) return;

    const normalizedProfile = {
      first_name: profile.first_name.trim(),
      last_name: profile.last_name.trim(),
      ...(profile.profile_image.trim()
        ? { profile_image: profile.profile_image.trim() }
        : {}),
    };

    if (!normalizedProfile.first_name || !normalizedProfile.last_name) {
      setError(t("nameRequired"));
      return;
    }

    const normalizedAddress = {
      company: address.company.trim(),
      address_line1: address.address_line1.trim(),
      address_line2: address.address_line2.trim(),
      city: address.city.trim(),
      postal_code: address.postal_code.trim(),
      region: address.region.trim(),
      country: address.country.trim(),
      phone: address.phone.trim(),
      is_default: Boolean(address.is_default),
    };

    const hasAnyAddressField = [
      normalizedAddress.company,
      normalizedAddress.address_line1,
      normalizedAddress.address_line2,
      normalizedAddress.city,
      normalizedAddress.postal_code,
      normalizedAddress.region,
      normalizedAddress.country,
      normalizedAddress.phone,
    ].some((value) => value.length > 0);

    if (hasAnyAddressField) {
      const requiredAddressFields = [
        normalizedAddress.address_line1,
        normalizedAddress.city,
        normalizedAddress.postal_code,
        normalizedAddress.region,
        normalizedAddress.country,
      ];

      if (requiredAddressFields.some((value) => value.length === 0)) {
        setError(t("addressRequired"));
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const updatedUser = await updateProfile({
        profile: normalizedProfile,
        ...(hasAnyAddressField ? { address: normalizedAddress } : {}),
      });
      const fresh = updatedUser ?? (await getMe());
      setUser(fresh);
      await refreshUser();
      setEdit(false);
    } catch (err: any) {
      setError(err?.message || t("saveError"));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900 pb-20">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!edit ? (
              <button
                onClick={() => setEdit(true)}
                className="btn btn-primary"
              >
                {t("editProfile")}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEdit(false)}
                  className="btn btn-outline"
                >
                  {t("cancel")}
                </button>
                <button
                  disabled={loading}
                  onClick={handleSave}
                  className="btn btn-primary"
                >
                  {loading ? t("saving") : t("save")}
                </button>
              </>
            )}
            <button
              onClick={() => logout().then(() => router.push("/login"))}
              className="btn btn-danger"
            >
              {t("logout")}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Basic Info */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border bg-white p-6 text-center lg:sticky lg:top-24">
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
                <h3 className="font-semibold text-slate-800">{t("personalData")}</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="label">{t("firstName")}</label>
                  <input
                    disabled={!edit}
                    className="input"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label">{t("lastName")}</label>
                  <input
                    disabled={!edit}
                    className="input"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="label text-slate-400">{t("emailLocked")}</label>
                  <input disabled className="input bg-gray-50 cursor-not-allowed opacity-70" value={user.email} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50">
                <h3 className="font-semibold text-slate-800">{t("shippingAddress")}</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="label">{t("company")}</label>
                  <input disabled={!edit} className="input" placeholder={t("companyPlaceholder")} value={address.company} onChange={(e) => setAddress({ ...address, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">{t("phone")}</label>
                  <input disabled={!edit} className="input" placeholder="+34..." value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="label">{t("address")}</label>
                  <input disabled={!edit} className="input" placeholder={t("addressPlaceholder")} value={address.address_line1} onChange={(e) => setAddress({ ...address, address_line1: e.target.value })} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <input disabled={!edit} className="input" placeholder={t("addressLine2Placeholder")} value={address.address_line2} onChange={(e) => setAddress({ ...address, address_line2: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">{t("city")}</label>
                  <input disabled={!edit} className="input" placeholder={t("city")} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">{t("postalCode")}</label>
                  <input disabled={!edit} className="input" placeholder={t("postalCode")} value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">{t("region")}</label>
                  <input disabled={!edit} className="input" placeholder={t("region")} value={address.region} onChange={(e) => setAddress({ ...address, region: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">{t("country")}</label>
                  <input disabled={!edit} className="input" placeholder={t("country")} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Orders & Invoices */}
            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50">
                <h3 className="font-semibold text-slate-800">{t("ordersInvoices")}</h3>
              </div>
              <div className="p-6">
                {ordersLoading ? (
                  <p className="text-sm text-slate-400">{t("loadingOrders")}</p>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-slate-400">{t("noOrders")}</p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const availableDocs = (order.billing_documents ?? []).filter(
                        (d) => ["ISSUED", "SENT", "PAID"].includes(d.status)
                      );
                      return (
                        <div
                          key={order.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border px-4 py-3 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-800">
                              {t("orderLabel", { number: order.order_number })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(order.created_at)} · {formatCurrency(order.total_amount, order.currency)}
                            </p>
                            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {t(`status.${order.status}` as any, { defaultValue: order.status })}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {availableDocs.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => handleDownloadInvoice(doc.id)}
                                disabled={downloadingDoc === doc.id}
                                className="btn btn-outline text-xs flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                {downloadingDoc === doc.id
                                  ? t("downloading")
                                  : doc.document_number
                                    ? t("downloadInvoice", { number: doc.document_number })
                                    : t("downloadInvoiceNoNumber")}
                              </button>
                            ))}
                            {availableDocs.length === 0 && (
                              <span className="text-xs text-slate-400 italic">{t("invoicePending")}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
