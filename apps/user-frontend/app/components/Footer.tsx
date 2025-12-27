import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white">
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Be the first to know.
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                placeholder="Enter your email id"
                className="w-full rounded-full px-5 py-3 bg-transparent border border-white/30 text-sm outline-none focus:border-white transition"
              />
              <button className="rounded-full bg-white text-black px-6 py-3 text-sm font-medium hover:bg-gray-200 transition">
                Subscribe
              </button>
            </div>
          </div>

          {/* Contact */}
          <div className="md:justify-self-end w-full md:max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>

            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>Paseo de las Palmeras, 3, Local B, 51001 Ceuta</span>
              </div>

              <div className="flex items-center gap-3">
                <Mail size={16} className="shrink-0" />
                <span>administracion@nexusssolutions.com</span>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={16} className="shrink-0" />
                <span>+34 656 806 899</span>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex gap-5 pt-5 text-white/80">
              {[Facebook, Instagram, Linkedin, Twitter].map((Icon, i) => (
                <Icon
                  key={i}
                  size={18}
                  className="cursor-pointer hover:text-white transition"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-white/60 text-center md:text-left">
          <p>
            © {new Date().getFullYear()} Sánchez Peinado Solutions SL —{" "}
            <span className="font-semibold text-white">NEXUS SP Solutions</span>
            . All rights reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            <span className="cursor-pointer hover:text-white transition">
              Legal Notice
            </span>
            <span className="cursor-pointer hover:text-white transition">
              Privacy Policy
            </span>
            <span className="cursor-pointer hover:text-white transition">
              Terms & Conditions
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
