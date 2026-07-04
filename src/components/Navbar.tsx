"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useGoogleFont from "@/hooks/useGoogleFont";
import { useLockBody } from "@/hooks/useLockBody";
import { getResizedUrl } from "@/lib/images";

type StorefrontNavbar = {
  bgColor: string;
  bgImage?: string;
  logoURL?: string;
  logoHeight?: number;
  logoText?: string;
  logoFont?: string;
  logoTextColor?: string;
  trackUrl?: string;
  policyLinks?: { label: string; url: string }[];
};

export default function Navbar({ storefrontNavbar }: { storefrontNavbar?: StorefrontNavbar }) {
  const pathname = usePathname();
  const isMinimalNav = pathname === "/signin" || pathname === "/track" || pathname.startsWith("/settings") || pathname.startsWith("/dashboard") || pathname.startsWith("/products") || pathname.startsWith("/orders") || pathname.startsWith("/store") || pathname.startsWith("/storefront");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useLockBody(isMenuOpen);

  const bgColor = storefrontNavbar?.bgColor || "#f68f1d";
  const bgImage = storefrontNavbar?.bgImage ? getResizedUrl(storefrontNavbar.bgImage, "1920") : "";
  const logoURL = storefrontNavbar?.logoURL || "";
  const logoHeight = storefrontNavbar?.logoHeight || 36;
  const logoText = storefrontNavbar?.logoText || "";
  const logoFont = storefrontNavbar?.logoFont || "Arial";
  const logoTextColor = storefrontNavbar?.logoTextColor || "#ffffff";

  useGoogleFont(logoFont);

  function isLight(color: string): boolean {
    const hex = color.replace("#", "");
    if (hex.length < 6) return true;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  const bgIsLight = isLight(bgColor);
  const trackColor = bgIsLight ? "#1a1a1a" : "#ffffff";
  const menuTextColor = bgIsLight ? "#1a1a1a" : "#ffffff";
  const menuTextMuted = bgIsLight ? "#4a4a4a" : "#d0d0d0";
  const menuBorder = bgIsLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)";

  const showHamburger = !!storefrontNavbar || !isMinimalNav;

  return (
    <>
      <nav
        className={`w-full z-50 transition-all duration-300 ${pathname === "/signin" ? "" : "sticky top-0"}`}
        style={{
          backgroundColor: bgImage ? "transparent" : bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative flex items-center justify-center px-4 md:px-margin-desktop h-16 max-w-[1440px] mx-auto">
          {/* Left: Hamburger */}
          {showHamburger && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden absolute left-4 flex items-center justify-center w-10 h-10 transition-colors"
              style={{ color: trackColor }}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}

          {/* Left: Desktop nav links */}
          {!isMinimalNav && (
            <div className="hidden md:flex absolute left-4 items-center gap-8">
              <Link href="#features" className="text-sm text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide">Features</Link>
              <Link href="#pricing" className="text-sm text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide">Pricing</Link>
            </div>
          )}

          {/* Logo - naturally centered by flex */}
          <div className="block leading-none max-w-[calc(100%-5rem)] md:max-w-none">
            {storefrontNavbar ? (
              logoURL ? (
                <img src={logoURL} alt="Store" className="object-contain mx-auto" loading="eager" decoding="async" style={{ height: logoHeight, maxWidth: "min(200px, 40vw)" }} />
              ) : logoText ? (
                <span className="block text-center" style={{ fontFamily: `"${logoFont}", serif`, color: logoTextColor, fontSize: `min(${logoHeight}px, 5.5vw)`, fontWeight: 700, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                  {logoText}
                </span>
              ) : null
            ) : (
              <Image
                src="/sellrilogo.png"
                alt="Sellri"
                width={140}
                height={56}
                className="object-contain py-1"
                priority
              />
            )}
          </div>

          {/* Right: Track / Sign in */}
          {!isMinimalNav ? (
            <div className="hidden md:flex absolute right-4 items-center gap-2 md:gap-3">
              <Link href="/signin" className="text-sm text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide whitespace-nowrap">Sign In</Link>
              <Link href="/signin" className="text-white border-2 border-white px-3 py-1.5 md:px-5 md:py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-white hover:text-[#f68f1d] active:scale-95 transition-all tracking-wide whitespace-nowrap">Sign Up</Link>
            </div>
          ) : storefrontNavbar?.trackUrl ? (
            <div className="absolute right-4 hidden md:flex items-center">
              <a href={storefrontNavbar.trackUrl} className="text-sm font-bold tracking-wide flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap" style={{ color: trackColor, backgroundColor: bgIsLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.12)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
                Track Order
              </a>
            </div>
          ) : null}
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}>
          <div
            className="absolute top-16 left-0 w-full shadow-xl"
            style={{ backgroundColor: bgColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col px-4 py-4">
              {!isMinimalNav ? (
                <>
                  <Link href="#features" className="transition-colors duration-200 font-medium tracking-wide py-3 border-b flex items-center" style={{ color: menuTextColor, borderColor: menuBorder }} onClick={() => setIsMenuOpen(false)}>Features</Link>
                  <Link href="#pricing" className="transition-colors duration-200 font-medium tracking-wide py-3 border-b flex items-center" style={{ color: menuTextColor, borderColor: menuBorder }} onClick={() => setIsMenuOpen(false)}>Pricing</Link>
                  <Link href="/signin" className="transition-colors duration-200 font-medium tracking-wide py-3 border-b flex items-center" style={{ color: menuTextColor, borderColor: menuBorder }} onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                  <Link href="/signin" className="border-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all text-center mt-3" style={{ color: menuTextColor, borderColor: menuTextColor }} onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                </>
              ) : (
                <>
                  {storefrontNavbar?.trackUrl && (
                    <a href={storefrontNavbar.trackUrl} className="transition-colors duration-200 font-bold tracking-wide py-3 border-b flex items-center gap-2" style={{ color: menuTextColor, borderColor: menuBorder }} onClick={() => setIsMenuOpen(false)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                      Track Order
                    </a>
                  )}
                  {storefrontNavbar?.policyLinks?.map((p) => (
                    <a key={p.label} href={p.url} className="transition-colors duration-200 text-sm py-3 border-b flex items-center gap-2" style={{ color: menuTextMuted, borderColor: menuBorder }} onClick={() => setIsMenuOpen(false)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>description</span>
                      {p.label}
                    </a>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
