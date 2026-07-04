"use client";

type FooterSectionProps = {
  storeName?: string;
  logo?: string;
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  copyright?: string;
  bgColor?: string;
  bgGradient?: string;
  bgImage?: string;
  termsUrl?: string;
  privacyUrl?: string;
  refundsUrl?: string;
  shippingUrl?: string;
  trackUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export default function FooterSection({
  storeName = "My Store",
  logo = "",
  instagram = "",
  whatsapp = "",
  facebook = "",
  copyright = "",
  bgColor = "",
  bgGradient = "",
  bgImage = "",
  termsUrl = "",
  privacyUrl = "",
  refundsUrl = "",
  shippingUrl = "",
  trackUrl = "",
  phone = "",
  email = "",
  address = "",
}: FooterSectionProps) {
  const hasBg = !!bgColor || !!bgGradient || !!bgImage;

  const policies = [
    { label: "Terms & Conditions", url: termsUrl },
    { label: "Privacy Policy", url: privacyUrl },
    { label: "Refunds & Returns", url: refundsUrl },
    { label: "Shipping Policy", url: shippingUrl },
    { label: "Track Order", url: trackUrl },
  ].filter((p) => p.url.trim());

  function isLight(color: string): boolean {
    const hex = color.replace("#", "");
    if (hex.length < 6) return true;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  const brandColor = hasBg ? (isLight(bgColor) ? "#1a1a1a" : "#ffffff") : "#94a3b8";

  return (
    <footer
      className="w-full px-6 py-10 md:py-12"
      style={bgGradient ? { background: bgGradient } : bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : (bgColor ? { backgroundColor: bgColor } : undefined)}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-6">
          {logo && (
            <img
              src={logo}
              alt={storeName}
              className="h-12 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          )}
          
          {!logo && (
            <h3 className={`text-2xl font-bold tracking-tight ${hasBg ? "text-white" : "text-slate-900"}`}>
              {storeName}
            </h3>
          )}

          {(instagram || whatsapp || facebook || phone || email || address) && (
            <div className="flex items-center gap-3">
              {instagram && (
                <a
                  href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-11 h-11 rounded-full transition-all duration-300 flex items-center justify-center group ${hasBg ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}
                >
                  <svg className={`w-5 h-5 transition-colors ${hasBg ? "text-white/80 group-hover:text-white" : "text-black group-hover:text-black"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                  </svg>
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp.startsWith("http") ? whatsapp : `https://wa.me/91${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-11 h-11 rounded-full transition-all duration-300 flex items-center justify-center group ${hasBg ? "bg-white/10 hover:bg-[#25D366]/20" : "bg-slate-100 hover:bg-emerald-50"}`}
                >
                  <svg className={`w-5 h-5 transition-colors ${hasBg ? "text-white/80 group-hover:text-[#25D366]" : "text-black group-hover:text-[#25D366]"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              )}
              {facebook && (
                <a
                  href={facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-11 h-11 rounded-full transition-all duration-300 flex items-center justify-center group ${hasBg ? "bg-white/10 hover:bg-[#1877F2]/20" : "bg-slate-100 hover:bg-blue-50"}`}
                >
                  <svg className={`w-5 h-5 transition-colors ${hasBg ? "text-white/80 group-hover:text-[#1877F2]" : "text-black group-hover:text-[#1877F2]"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className={`w-11 h-11 rounded-full transition-all duration-300 flex items-center justify-center group ${hasBg ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}>
                  <svg className={`w-5 h-5 transition-colors ${hasBg ? "text-white/80 group-hover:text-white" : "text-black group-hover:text-black"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className={`w-11 h-11 rounded-full transition-all duration-300 flex items-center justify-center group ${hasBg ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}>
                  <svg className={`w-5 h-5 transition-colors ${hasBg ? "text-white/80 group-hover:text-white" : "text-black group-hover:text-black"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              )}
              {address && (
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className={`w-11 h-11 rounded-full transition-all duration-300 flex items-center justify-center group ${hasBg ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}>
                  <svg className={`w-5 h-5 transition-colors ${hasBg ? "text-white/80 group-hover:text-white" : "text-black group-hover:text-black"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {policies.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {policies.map((p) => (
                <a
                  key={p.label}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs transition-colors duration-300 underline underline-offset-2 ${hasBg ? "text-white/50 hover:text-white/80" : "text-black hover:text-black/70"}`}
                >
                  {p.label}
                </a>
              ))}
            </div>
          )}
          <div
            className="px-5 py-2.5 rounded-full border inline-flex items-center gap-2"
            style={{ fontFamily: "'Montserrat', sans-serif", borderColor: "#FF9933", backgroundColor: "rgba(255,153,51,0.08)" }}
          >
              <span className="text-xs" style={{ color: "#FF9933" }}>&#10022;</span>
              <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
                Made with{" "}
                <a
                  href="https://sellri.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold transition-colors duration-300 hover:opacity-70"
                  style={{ color: "#FF9933" }}
                >
                  Sellri
                </a>
              </span>
            </div>

          {copyright && (
            <p className={`text-sm transition-colors duration-300 ${hasBg ? "text-white/40 hover:text-white/60" : "text-black/50 hover:text-black/70"}`}>
              {copyright}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
