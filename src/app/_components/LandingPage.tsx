"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("opacity-100", "translate-y-0");
          el.classList.remove("opacity-0", "translate-y-10");
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 opacity-0 translate-y-10"
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <Script id="schema-structured-data" type="application/ld+json" strategy="beforeInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Sellri",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "Transform your social media into a professional storefront. Create a free store page in 60 seconds.",
          offers: {
            "@type": "Offer",
            price: "149",
            priceCurrency: "INR",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "250",
          },
        })}
      </Script>
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface via-surface to-primary-fixed/20 pt-16 md:pt-20">
        <div className="absolute top-1/4 left-0 w-64 h-64 md:w-96 md:h-96 bg-primary-container/10 rounded-full blur-[120px] -translate-x-1/2" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 md:w-96 md:h-96 bg-tertiary-container/10 rounded-full blur-[120px] translate-x-1/2" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 md:w-64 md:h-64 bg-primary/5 rounded-full blur-[80px]" />

        <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-space-xl items-center relative">
          <div className="space-y-4 md:space-y-space-lg text-center lg:text-left z-10 order-2 lg:order-1">
            <h1 className="font-display-lg text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[1.1] tracking-tight text-on-background font-extrabold">
              Stop losing orders in your{" "}
              <span className="text-primary relative">
                Instagram DMs.
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 10C72 2 172 2 298 10"
                    stroke="#ab3500"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="8 6"
                    opacity="0.3"
                  />
                </svg>
              </span>
            </h1>

            <p className="font-body-lg text-base sm:text-body-lg text-on-surface-variant max-w-[560px] mx-auto lg:mx-0 leading-relaxed">
              Transform your social media into a professional storefront. A simple
              link your buyers can browse and order from&mdash;instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-space-md justify-center lg:justify-start pt-2 md:pt-space-md">
              <Link href="/signin" className="text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-2xl font-headline-md text-base sm:text-headline-md hover:translate-y-[-2px] hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-space-xs" style={{ backgroundColor: "#f68f1d" }}>
                Create your free page
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end items-center order-1 lg:order-2">
            <div className="relative w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] animate-float">
              <div className="relative rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15)] md:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border-[4px] sm:border-[6px] md:border-[8px] border-white bg-white">
                <img
                  alt="Sellri Premium Storefront Mockup"
                  className="w-full h-auto object-cover"
                  src="/hero.png"
                />
                <div className="absolute -z-10 -bottom-8 -right-8 w-40 h-40 md:w-64 md:h-64 bg-primary/20 rounded-full blur-[80px] md:blur-[100px]" />
                <div className="absolute -z-10 -top-8 -left-8 w-40 h-40 md:w-64 md:h-64 bg-tertiary-container/10 rounded-full blur-[80px] md:blur-[100px]" />
              </div>

              {/* Mobile: Hide stats on very small screens */}
              <div className="absolute -bottom-4 -left-3 sm:-bottom-6 sm:-left-6 glass-card p-3 sm:p-4 md:p-5 rounded-xl md:rounded-2xl shadow-xl border border-outline-variant/30 flex items-center gap-3 md:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <span className="material-symbols-outlined text-base sm:text-xl md:text-2xl font-bold">
                    trending_up
                  </span>
                </div>
                <div>
                  <p className="text-[8px] sm:text-[10px] md:text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                    Daily Orders
                  </p>
                  <p className="text-sm sm:text-base md:text-headline-md font-extrabold text-on-surface">
                    +124% Growth
                  </p>
                </div>
              </div>

              <div className="absolute top-6 -right-2 sm:top-10 sm:-right-3 md:top-12 md:-right-4 glass-card p-2 sm:p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl border border-outline-variant/30 max-w-[130px] sm:max-w-[160px] md:max-w-[180px] hidden xs:block">
                <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[8px] sm:text-[10px] md:text-label-sm font-bold">New Sale!</span>
                </div>
                <p className="text-[9px] sm:text-[11px] md:text-[13px] text-on-surface-variant leading-tight">
                  Anjali from Pune just bought &apos;Silk Sari&apos;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Fixed mobile padding */}
      <ScrollReveal>
        <section className="py-8 md:py-space-xl bg-surface-container-low" id="how-it-works">
          <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop">
            <div className="text-center mb-8 md:mb-space-xl">
              <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg mb-2 md:mb-space-xs">
                Launch your store in 60 seconds
              </h2>
              <p className="text-on-surface-variant max-w-[560px] mx-auto text-sm sm:text-base">
                Skip the complicated websites. Sellri is built for the fast-paced
                world of social commerce.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-space-xl relative">
              <div className="flex flex-col items-center text-center space-y-3 md:space-y-space-md group">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <span className="material-symbols-outlined text-3xl md:text-[40px]">
                    add_photo_alternate
                  </span>
                </div>
                <h3 className="font-headline-md text-lg md:text-headline-md">Add Products</h3>
                <p className="text-on-surface-variant text-sm md:text-base">
                  Snap a photo, add a price, and write a quick description.
                  It&apos;s that easy.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3 md:space-y-space-md group">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <span className="material-symbols-outlined text-3xl md:text-[40px]">
                    share
                  </span>
                </div>
                <h3 className="font-headline-md text-lg md:text-headline-md">Share Link</h3>
                <p className="text-on-surface-variant text-sm md:text-base">
                  Paste your Sellri link in your Instagram bio or send it directly
                  on WhatsApp.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3 md:space-y-space-md group">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                  <span className="material-symbols-outlined text-3xl md:text-[40px]">
                    shopping_cart_checkout
                  </span>
                </div>
                <h3 className="font-headline-md text-lg md:text-headline-md">Get Orders</h3>
                <p className="text-on-surface-variant text-sm md:text-base">
                  Customers browse your catalog and send you structured orders in
                  one tap.
                </p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Features - Fixed mobile grid */}
      <ScrollReveal>
        <section className="py-8 md:py-space-xl" id="features">
          <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop">
            <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg mb-6 md:mb-space-xl text-center">
              Everything you need to grow
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-gutter">
              <div className="md:col-span-8 bg-white border border-outline-variant/30 rounded-2xl p-4 md:p-space-lg flex flex-col md:flex-row gap-4 md:gap-space-lg overflow-hidden group">
                <div className="flex-1 space-y-3 md:space-y-space-md">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl md:text-3xl">dashboard</span>
                  </div>
                  <h3 className="font-headline-md text-lg md:text-headline-md">
                    Management Dashboard
                  </h3>
                  <p className="text-on-surface-variant text-sm md:text-base">
                    Track sales, inventory, and customer messages in one powerful
                    place. No more switching between apps.
                  </p>
                  <ul className="space-y-1 md:space-y-space-xs pt-1 md:pt-space-xs">
                    <li className="flex items-center gap-1 md:gap-space-xs font-label-md text-sm md:text-base">
                      <span className="material-symbols-outlined text-green-500 text-sm md:text-base">check_circle</span>
                      Real-time sales tracking
                    </li>
                    <li className="flex items-center gap-1 md:gap-space-xs font-label-md text-sm md:text-base">
                      <span className="material-symbols-outlined text-green-500 text-sm md:text-base">check_circle</span>
                      Inventory alerts
                    </li>
                    <li className="flex items-center gap-1 md:gap-space-xs font-label-md text-sm md:text-base">
                      <span className="material-symbols-outlined text-green-500 text-sm md:text-base">check_circle</span>
                      Customer data insights
                    </li>
                  </ul>
                </div>
                <div className="flex-1 bg-surface-container-low rounded-xl p-3 md:p-space-md border border-outline-variant/20 group-hover:scale-105 transition-transform">
                  <div className="space-y-2 md:space-y-space-sm">
                    <div className="h-3 md:h-4 w-2/3 bg-outline-variant/30 rounded" />
                    <div className="grid grid-cols-2 gap-2 md:gap-space-sm">
                      <div className="h-16 md:h-20 bg-primary-container/20 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-[8px] md:text-[10px] text-on-surface-variant">Revenue</p>
                          <p className="text-base md:text-headline-md text-primary font-bold">₹12.4k</p>
                        </div>
                      </div>
                      <div className="h-16 md:h-20 bg-tertiary-container/20 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-[8px] md:text-[10px] text-on-surface-variant">Orders</p>
                          <p className="text-base md:text-headline-md text-tertiary font-bold">48</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-16 md:h-24 bg-white rounded-lg shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 bg-white border border-outline-variant/30 rounded-2xl p-4 md:p-space-lg space-y-3 md:space-y-space-md relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 md:mb-space-md">
                    <span className="material-symbols-outlined text-2xl md:text-[32px] text-primary">payments</span>
                  </div>
                  <h3 className="font-headline-md text-lg md:text-headline-md text-primary">
                    UPI Integration
                  </h3>
                  <p className="text-on-surface-variant text-sm md:text-base">
                    Accept payments instantly via any UPI app. Directly to your bank
                    account with zero commission.
                  </p>
                </div>
                <div className="absolute -bottom-8 -right-8 md:-bottom-10 md:-right-10 opacity-10 text-primary">
                  <span className="material-symbols-outlined text-[100px] md:text-[160px]">account_balance_wallet</span>
                </div>
              </div>

              <div className="md:col-span-4 bg-white border border-outline-variant/30 rounded-2xl p-4 md:p-space-lg space-y-3 md:space-y-space-md">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl md:text-[28px] text-primary">currency_rupee</span>
                </div>
                <h3 className="font-headline-md text-lg md:text-headline-md text-primary">
                  Razorpay Integration
                </h3>
                <p className="text-on-surface-variant text-sm md:text-base">
                  Accept credit/debit cards, net banking, UPI, and wallets via
                  Razorpay. Secure, fast, and reliable payments.
                </p>
                <div className="flex items-center gap-1 md:gap-2 pt-1 md:pt-space-xs flex-wrap">
                  <span className="text-[8px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-high px-2 py-1 rounded">Cards</span>
                  <span className="text-[8px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-high px-2 py-1 rounded">Net Banking</span>
                  <span className="text-[8px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-high px-2 py-1 rounded">UPI</span>
                </div>
              </div>

              <div className="md:col-span-8 bg-inverse-surface text-inverse-on-surface rounded-2xl p-4 md:p-space-lg flex flex-col md:flex-row items-center gap-4 md:gap-space-lg">
                <div className="flex-1 space-y-3 md:space-y-space-md">
                  <h3 className="font-headline-md text-lg md:text-headline-md">
                    Professional Storefront
                  </h3>
                  <p className="text-surface-variant text-sm md:text-base">
                    A custom-branded URL that looks amazing on any device. Built for
                    high conversion rates.
                  </p>
                </div>
                <div className="flex-1 w-full">
                  <div className="bg-surface/10 rounded-xl aspect-video relative overflow-hidden flex items-center justify-center">
                    <div className="w-3/4 h-2/3 bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 p-2 md:p-space-sm space-y-1 md:space-y-space-xs">
                      <div className="w-1/2 h-1.5 md:h-2 bg-white/40 rounded" />
                      <div className="w-full h-8 md:h-12 bg-white/10 rounded" />
                      <div className="flex gap-1 md:gap-2">
                        <div className="w-1/3 h-6 md:h-8 bg-white/20 rounded" />
                        <div className="w-1/3 h-6 md:h-8 bg-white/20 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Pricing - Fixed mobile */}
      <ScrollReveal>
        <section className="py-8 md:py-space-xl bg-surface-container-lowest" id="pricing">
          <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop">
            <div className="text-center mb-6 md:mb-space-xl">
              <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg">
                Simple, transparent pricing
              </h2>
              <p className="text-on-surface-variant mt-2 md:mt-space-xs max-w-[480px] mx-auto text-sm md:text-base">
                No hidden fees. No transaction cuts. Just one plan.
              </p>
            </div>

            <div className="max-w-[420px] mx-auto">
              <div className="relative rounded-3xl border-2 border-primary/20 bg-white">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 text-white px-4 md:px-5 py-1 md:py-1.5 rounded-full text-[10px] md:text-label-sm font-bold uppercase tracking-widest whitespace-nowrap shadow-lg" style={{ backgroundColor: "#f68f1d" }}>
                  Bharat Special
                </div>
                <div className="pt-8 md:pt-10 pb-6 md:pb-space-lg px-4 md:px-space-lg">
                  <div className="text-center mb-6 md:mb-space-lg">
                    <p className="text-on-surface-variant font-label-md text-sm md:text-base mb-1 md:mb-2">Professional Plan</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight">₹149</span>
                      <span className="text-on-surface-variant text-sm md:text-base">/month</span>
                    </div>
                  </div>
                  <div className="space-y-2 md:space-y-4 mb-6 md:mb-space-lg">
                    {["Unlimited Products", "WhatsApp Order Integration", "Custom Store URL", "Inventory Management", "No Transaction Fees"].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 md:gap-3">
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-xs md:text-sm">check_circle</span>
                        </div>
                        <span className="text-sm md:text-body-md">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/signin" className="block w-full text-white py-3 md:py-4 rounded-xl font-headline-md text-base md:text-headline-md hover:translate-y-[-2px] active:scale-95 transition-all text-center" style={{ backgroundColor: "#f68f1d" }}>
                    Start your 14-day free trial
                  </Link>
                  <p className="text-center text-label-sm text-on-surface-variant mt-3 md:mt-4 text-xs md:text-sm">
                    No Payment details required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* FAQ - Fixed mobile */}
      <ScrollReveal>
        <section className="py-8 md:py-space-xl">
          <div className="max-w-3xl mx-auto px-4 md:px-margin-desktop">
            <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg mb-6 md:mb-space-xl text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2 md:space-y-space-sm">
              {[
                { question: "Is Sellri a website builder?", answer: "No, it's even simpler. Sellri is a specialized commerce engine that turns your product list into a high-converting shop link optimized for mobile buyers and WhatsApp users." },
                { question: "How do I receive payments?", answer: "You can link your UPI ID (GPay, PhonePe, Paytm). When a customer buys, they pay you directly. We take 0% commission." },
                { question: "Does it work with Instagram?", answer: "Perfectly. Most of our users paste their Sellri link in their Instagram Bio. It's the best way to convert followers into paying customers." },
              ].map((faq, i) => (
                <details key={i} className="group bg-white border border-outline-variant/30 rounded-xl overflow-hidden" open={i === 0}>
                  <summary className="flex justify-between items-center p-3 md:p-space-md cursor-pointer list-none">
                    <span className="font-headline-md text-sm md:text-headline-md pr-2 md:pr-md">{faq.question}</span>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform text-xl md:text-2xl">expand_more</span>
                  </summary>
                  <div className="p-3 md:p-space-md pt-0 text-on-surface-variant font-body-md text-sm md:text-base">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* CTA - Fixed mobile */}
      <ScrollReveal>
        <section className="py-8 md:py-space-xl relative">
          <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop">
            <div className="rounded-2xl md:rounded-[2.5rem] p-6 md:p-space-lg lg:p-space-xl text-center space-y-4 md:space-y-space-md relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #f68f1d 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="absolute -top-20 -right-20 w-48 h-48 md:w-64 md:h-64 rounded-full opacity-10" style={{ background: "#f68f1d", filter: "blur(80px)" }} />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 md:w-64 md:h-64 rounded-full opacity-10" style={{ background: "#f68f1d", filter: "blur(80px)" }} />
              <h2 className="font-display-lg text-2xl sm:text-3xl md:text-4xl lg:text-display-lg text-white relative z-10">
                Your dream business deserves a professional home.
              </h2>
              <p className="text-base md:text-headline-md text-white/70 max-w-2xl mx-auto relative z-10">
                Join thousands of entrepreneurs across India who are selling more
                and working less with Sellri.
              </p>
              <div className="pt-2 md:pt-space-md relative z-10">
                <Link href="/signin" className="inline-block text-[#1a1a2e] px-6 sm:px-8 md:px-12 py-3 md:py-5 rounded-full font-headline-lg text-base md:text-headline-lg hover:scale-105 active:scale-95 transition-all shadow-2xl font-bold" style={{ backgroundColor: "#f68f1d" }}>
                  Create your free page now
                </Link>
                <p className="mt-3 md:mt-space-md text-label-sm text-white/50 text-xs md:text-sm">
                  Free 14-day trial &bull; No setup fee &bull; Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <Footer />
    </>
  );
}
