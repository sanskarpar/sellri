"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useGoogleFont from "@/hooks/useGoogleFont";
import { useLockBody } from "@/hooks/useLockBody";

type StorefrontNavbar = {
  logoPosition: "left" | "center" | "right";
  bgColor: string;
  bgImage?: string;
  logoURL?: string;
  logoHeight?: number;
  logoText?: string;
  logoFont?: string;
  logoTextColor?: string;
};

export default function Navbar({ storefrontNavbar }: { storefrontNavbar?: StorefrontNavbar }) {
  const pathname = usePathname();
  const isMinimalNav = pathname === "/signin" || pathname.startsWith("/settings") || pathname.startsWith("/dashboard") || pathname.startsWith("/products") || pathname.startsWith("/orders") || pathname.startsWith("/store") || pathname.startsWith("/storefront");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useLockBody(isMenuOpen);

  const bgColor = storefrontNavbar?.bgColor || "#f68f1d";
  const bgImage = storefrontNavbar?.bgImage || "";
  const logoURL = storefrontNavbar?.logoURL || "";
  const logoHeight = storefrontNavbar?.logoHeight || 36;
  const logoPos = storefrontNavbar?.logoPosition || "center";
  const logoText = storefrontNavbar?.logoText || "";
  const logoFont = storefrontNavbar?.logoFont || "Arial";
  const logoTextColor = storefrontNavbar?.logoTextColor || "#ffffff";

  useGoogleFont(logoFont);

  return (
    <>
      <nav
        className="w-full z-50 transition-all duration-300"
        style={{
          backgroundColor: bgImage ? "transparent" : bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center justify-between px-4 md:px-margin-desktop h-16 max-w-[1440px] mx-auto">
          {/* Mobile: Hamburger menu button - left side (only when not minimal) */}
          {!isMinimalNav && logoPos !== "left" && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 text-white hover:text-white/80 transition-colors"
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

          {/* Desktop nav links - left side */}
          {!isMinimalNav && (
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide">Features</Link>
              <Link href="#pricing" className="text-sm text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide">Pricing</Link>
            </div>
          )}

          {/* Logo */}
          {storefrontNavbar ? (
            <div
              className="flex h-full items-center"
              style={
                logoPos === "left"
                  ? { position: "absolute", left: 0 }
                  : logoPos === "right"
                  ? { position: "absolute", right: 0 }
                  : { position: "absolute", left: "50%", transform: "translateX(-50%)" }
              }
            >
              {logoURL ? (
                <img src={logoURL} alt="Store" className="object-contain" style={{ height: logoHeight, maxWidth: 200 }} />
              ) : logoText ? (
                <span style={{ fontFamily: `"${logoFont}", serif`, color: logoTextColor, fontSize: logoHeight, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
                  {logoText}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-center absolute left-1/2 -translate-x-1/2">
              {isMinimalNav ? (
                <Image
                  src="/sellrilogo.png"
                  alt="Sellri"
                  width={140}
                  height={56}
                  className="object-contain h-full py-1"
                  priority
                />
              ) : (
                <Link href="/" className="flex h-full items-center">
                  <Image
                    src="/sellrilogo.png"
                    alt="Sellri"
                    width={140}
                    height={56}
                    className="object-contain h-full py-1"
                    priority
                  />
                </Link>
              )}
            </div>
          )}

          {/* Right side - Sign In/Sign Up */}
          {!isMinimalNav && (
            <div className="flex items-center gap-2 md:gap-3">
              <Link href="/signin" className="text-sm text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide">Sign In</Link>
              <Link href="/signin" className="text-white border-2 border-white px-3 py-1.5 md:px-5 md:py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-white hover:text-[#f68f1d] active:scale-95 transition-all tracking-wide whitespace-nowrap">Sign Up</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu - Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute top-16 left-0 w-64 h-[calc(100vh-4rem)] p-6 shadow-xl" style={{ backgroundColor: bgColor }} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col space-y-4">
              <Link href="#features" className="text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide py-2 border-b border-white/20" onClick={() => setIsMenuOpen(false)}>Features</Link>
              <Link href="#pricing" className="text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide py-2 border-b border-white/20" onClick={() => setIsMenuOpen(false)}>Pricing</Link>
              <Link href="/signin" className="text-white/85 hover:text-white transition-colors duration-200 font-medium tracking-wide py-2 border-b border-white/20" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
              <Link href="/signin" className="text-white border-2 border-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-white hover:text-[#f68f1d] transition-all text-center mt-2" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
