import { Mail, Phone, MapPin, Send, Activity } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setFormData({
        name: "",
        email: "",
        company: "",
        service: "",
        message: "",
      });
      setSubmitted(false);
    }, 3200);
  };

  return (
    <section
      id="contact"
      className="relative min-h-screen bg-[#0f1115] py-32 px-6 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-12 gap-16">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-block px-3 py-1 border-l-2 border-amber-500 bg-white/5 text-amber-500 text-[10px] tracking-[0.3em] uppercase font-bold mb-6">
                {t("contact.badge")}
              </div>
              <h2 className="text-5xl md:text-7xl font-light text-white tracking-tighter leading-none mb-8 uppercase">
                {t("contact.titleMain")} <br />
                <span className="font-serif italic text-amber-500">
                  {t("contact.titleItalic")}
                </span>
              </h2>
              <p className="text-gray-500 font-light max-w-sm leading-relaxed">
                {t("contact.description")}
              </p>
            </motion.div>

            <div className="space-y-px bg-white/10 border border-white/10">
              {[
                {
                  icon: MapPin,
                  label: "STATION",
                  value: "Ceuta, Spain",
                  id: "LOC_DATA",
                },
                {
                  icon: Phone,
                  label: "VOICE",
                  value: "+34 (5) 6XX-XXXX",
                  id: "TEL_DATA",
                },
                {
                  icon: Mail,
                  label: "ENCRYPTED",
                  value: "info@nexussp.es",
                  id: "EML_DATA",
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  className="bg-[#0f1115] p-6 flex items-start gap-4 group"
                >
                  <item.icon className="h-5 w-5 text-gray-600 group-hover:text-amber-500 transition-colors mt-1" />
                  <div>
                    <p className="text-[10px] font-mono text-amber-500/40 tracking-widest uppercase">
                      {item.id}
                    </p>
                    <p className="text-lg font-light text-white">
                      {item.value}
                    </p>
                    <p className="text-xs text-gray-600 uppercase tracking-tighter mt-1">
                      {item.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="pt-8 flex items-center gap-4">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                {t("contact.status")}
              </span>
            </div>
          </div>

          {/* Right Column: Form */}
          <motion.div
            className="lg:col-span-7 bg-white/[0.02] border border-white/10 p-8 md:p-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid md:grid-cols-2 gap-10">
                {[
                  { name: "name", label: t("contact.form.name"), type: "text" },
                  {
                    name: "email",
                    label: t("contact.form.email"),
                    type: "email",
                  },
                  {
                    name: "company",
                    label: t("contact.form.company"),
                    type: "text",
                  },
                ].map((field) => (
                  <div key={field.name} className="relative">
                    <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest">
                      {field.label}
                    </label>
                    <input
                      name={field.name}
                      type={field.type}
                      required
                      value={(formData as any)[field.name]}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-amber-500 font-light transition-colors"
                    />
                  </div>
                ))}

                <div className="relative">
                  <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest">
                    {t("contact.form.sector")}
                  </label>
                  <select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    className="w-full bg-[#0f1115] border-b border-white/10 py-2 text-white focus:outline-none focus:border-amber-500 font-light transition-colors"
                  >
                    <option value="" className="bg-[#0f1115]">
                      {t("contact.form.sectorPlaceholder")}
                    </option>
                    <option value="infra" className="bg-[#0f1115]">
                      {t("contact.sectors.infra")}
                    </option>
                    <option value="cyber" className="bg-[#0f1115]">
                      {t("contact.sectors.cyber")}
                    </option>
                    <option value="cloud" className="bg-[#0f1115]">
                      {t("contact.sectors.cloud")}
                    </option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest">
                  {t("contact.form.message")}
                </label>
                <textarea
                  name="message"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-amber-500 font-light transition-colors resize-none"
                  placeholder={t("contact.form.messagePlaceholder")}
                />
              </div>

              <div className="relative group">
                <button
                  type="submit"
                  disabled={submitted}
                  className="w-full py-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-xs relative z-10 overflow-hidden"
                >
                  <span className="relative z-20 flex items-center justify-center gap-3">
                    {submitted
                      ? t("contact.form.submitting")
                      : t("contact.form.submit")}
                    {!submitted && <Send className="h-4 w-4" />}
                  </span>
                  <motion.div
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "0%" }}
                    className="absolute inset-0 bg-amber-500 z-10 transition-transform duration-300"
                  />
                </button>
                <div className="absolute inset-0 border border-white translate-x-2 translate-y-2 -z-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
              </div>
            </form>

            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-8 font-mono text-[10px] text-amber-500 tracking-widest uppercase border border-amber-500/20 bg-amber-500/5 p-4"
                >
                  {t("contact.form.success")}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
