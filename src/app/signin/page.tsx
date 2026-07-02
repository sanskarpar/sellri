"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SignInPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          onboarded: false,
        });
      }

      localStorage.setItem("sellri_user", JSON.stringify({
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
      }));

      const snapAfter = await getDoc(userRef);
      const udata = snapAfter.data();
      const onboarded = snapAfter.exists() && udata?.onboarded === true;
      const hasPlan = snapAfter.exists() && !!udata?.plan;
      router.push(!hasPlan ? "/choose-plan" : onboarded ? "/dashboard" : "/dashboard");
    } catch (err: unknown) {
      let message = "Something went wrong";
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          message = "";
        } else if (code === "auth/popup-blocked") {
          message = "Popup was blocked. Please allow popups for this site.";
        } else {
          message = err.message;
        }
      }
      if (message) setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <Navbar />
      <main className="flex flex-1 flex-col md:flex-row">
        {/* Mobile brand strip */}
        <section className="md:hidden px-5 py-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #ff6b35 0%, #ab3500 100%)" }}
        >
          <div className="flex-1">
            <h1 className="font-title-md text-sm text-white/90 leading-tight">
              Grow your business where your customers are.
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 rounded-full border border-white/40 overflow-hidden bg-white/20">
                  <img width={20} height={20} className="w-full h-full object-cover" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqwcdqO1RWY_MkDusQ7Ba4i4t6Ui_oPhSbtwdXalscrR2Iou9_gAKttCFg6KJtq_IWq_PsENm5_GCH4y9woCmyKQieTqG3prskDGON9Koad9HHRbfY58tiIx2rCplibPeH5DuBF1hBBbHU6LGwcBK-VF8WVMjnXMc9Wsj1pjnGFWqlXih8JBZkuo-iKMbD25A5d_rjw8Mn9d12n2L8gzmtzTkLHN3kk0cSoEhpwiGjdnr7XODmtSQzVJ8YhNPg-_wvOHLrq-05oTk" />
                </div>
                <div className="w-5 h-5 rounded-full border border-white/40 overflow-hidden bg-white/20">
                  <img width={20} height={20} className="w-full h-full object-cover" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqO6dSbr5Esz7zk_l2UCC9L9gDxNhbEOMLmoX6FhalcWTzSienWrp3aIOry6p5lYje4b7mbDhIqGBtj22L1oJihd2Q7XUnsnFJIy_PBKMz4L7oe3NX8YRwd-sc2lGsEEtODZ50DjjAy61xP4yYbND9pEis2laPHJeqKgDVMQaNkpZMxWqrHmzeNfSOspFNqMZgYXuUwLt1ILw5xux67sMd9ql5-qQvBYR_wRX6CHLWwgBIeAporntXsjzb2T_p47du-RI6M3SFir8" />
                </div>
                <div className="w-5 h-5 rounded-full border border-white/40 overflow-hidden bg-white/20">
                  <img width={20} height={20} className="w-full h-full object-cover" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKj7ZJv6QtTv9XYevDPkfcv2hYyPFKv5EiW4z2UCCgpngW_1tNWDejwtiyx05ENPGtjnBufy5nzaYsjQUeYvOopNZH055Cfq91dAaW3FfWaT0jw0w8YDM-MvycmAqL0Upp6hjpP_PAdE1JafEA4lQW1oogp3CvmUTK_pbDrQWycPiLH2hKMUcbWKL0lSUqS0IgJNuTXPrp79-JbECEjKdRgDNPwgTuXO_UFCKArvDyT_siSFAd5GXigBnfT14bbF4DPBD-Q7tizfg" />
                </div>
              </div>
              <span className="font-label-sm text-[10px] text-white/60">+10k entrepreneurs</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </section>

        {/* Desktop brand section */}
        <section className="hidden md:flex md:w-1/2 relative overflow-hidden items-center justify-center p-space-xl"
          style={{ background: "linear-gradient(135deg, #ff6b35 0%, #ab3500 100%)" }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/30 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-fixed blur-[100px]" style={{ animation: "bounce 8s ease-in-out infinite" }} />
          </div>
          <div className="relative z-10 w-full max-w-lg">
            <div className="p-8 md:p-10 rounded-xl flex flex-col items-center text-center"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <h1 className="font-display-lg text-4xl md:text-display-lg text-white mb-4 md:mb-6">
                Grow your business where your customers are.
              </h1>
              <div className="h-px w-20 md:w-24 bg-white/30 mb-6 md:mb-8" />
              <p className="font-headline-md text-lg md:text-headline-md text-white/90 italic">
                &ldquo;Empowering Indian entrepreneurs to sell effortlessly.&rdquo;
              </p>
              <div className="mt-8 md:mt-12 flex -space-x-3 md:-space-x-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white overflow-hidden bg-surface-dim">
                  <img width={48} height={48} className="w-full h-full object-cover" alt="Entrepreneur" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqwcdqO1RWY_MkDusQ7Ba4i4t6Ui_oPhSbtwdXalscrR2Iou9_gAKttCFg6KJtq_IWq_PsENm5_GCH4y9woCmyKQieTqG3prskDGON9Koad9HHRbfY58tiIx2rCplibPeH5DuBF1hBBbHU6LGwcBK-VF8WVMjnXMc9Wsj1pjnGFWqlXih8JBZkuo-iKMbD25A5d_rjw8Mn9d12n2L8gzmtzTkLHN3kk0cSoEhpwiGjdnr7XODmtSQzVJ8YhNPg-_wvOHLrq-05oTk" />
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white overflow-hidden bg-surface-dim">
                  <img width={48} height={48} className="w-full h-full object-cover" alt="Entrepreneur" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqO6dSbr5Esz7zk_l2UCC9L9gDxNhbEOMLmoX6FhalcWTzSienWrp3aIOry6p5lYje4b7mbDhIqGBtj22L1oJihd2Q7XUnsnFJIy_PBKMz4L7oe3NX8YRwd-sc2lGsEEtODZ50DjjAy61xP4yYbND9pEis2laPHJeqKgDVMQaNkpZMxWqrHmzeNfSOspFNqMZgYXuUwLt1ILw5xux67sMd9ql5-qQvBYR_wRX6CHLWwgBIeAporntXsjzb2T_p47du-RI6M3SFir8" />
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white overflow-hidden bg-surface-dim">
                  <img width={48} height={48} className="w-full h-full object-cover" alt="Entrepreneur" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKj7ZJv6QtTv9XYevDPkfcv2hYyPFKv5EiW4z2UCCgpngW_1tNWDejwtiyx05ENPGtjnBufy5nzaYsjQUeYvOopNZH055Cfq91dAaW3FfWaT0jw0w8YDM-MvycmAqL0Upp6hjpP_PAdE1JafEA4lQW1oogp3CvmUTK_pbDrQWycPiLH2hKMUcbWKL0lSUqS0IgJNuTXPrp79-JbECEjKdRgDNPwgTuXO_UFCKArvDyT_siSFAd5GXigBnfT14bbF4DPBD-Q7tizfg" />
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-primary-container flex items-center justify-center text-white text-[8px] md:text-label-sm font-bold">
                  +10k
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form section */}
        <section className="flex-1 flex flex-col justify-center items-center px-5 py-6 md:p-12 bg-background">
          <div className="w-full max-w-md">
            <div className="bg-surface-container-lowest p-6 sm:p-6 md:p-8 rounded-xl border border-outline-variant/30 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
              <h3 className="font-headline-lg text-2xl sm:text-2xl md:text-headline-lg text-on-surface mb-2">
                Welcome to Sellri
              </h3>
              <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant mb-8">
                Sign in or create an account with Google.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-label-sm text-xs sm:text-label-sm text-red-600 mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-xl font-label-md text-sm sm:text-label-md border border-outline hover:bg-surface-container-low active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer bg-white text-on-surface"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? "Please wait..." : "Continue with Google"}
              </button>

              <p className="mt-8 text-center font-label-sm text-[10px] sm:text-label-sm text-on-surface-variant">
                By continuing, you agree to Sellri&apos;s{" "}
                <Link href="/policies/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/policies/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}