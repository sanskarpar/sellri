"use client";

import { useState, useEffect, useRef } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const testingModeSet = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("sellri_user")) {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!resendCooldown) return;
    if (resendTimer <= 0) {
      setResendCooldown(false);
      setResendTimer(30);
      return;
    }
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown, resendTimer]);

  useEffect(() => {
    if (!testingModeSet.current) {
      (auth as any).settings.appVerificationDisabledForTesting = true;
      testingModeSet.current = true;
    }
    return () => {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  function setupRecaptcha() {
    if ((window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier.clear();
      (window as any).recaptchaVerifier = null;
    }
    if (!recaptchaContainerRef.current) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: "invisible",
      callback: () => {},
    });
  }

  async function handleSendOtp() {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;

      let phoneDoc;
      try {
        phoneDoc = await getDoc(doc(db, "phoneNumbers", fullPhone));
      } catch (lookupErr) {
        console.error("Phone lookup failed:", lookupErr);
        throw new Error("Could not verify phone number right now. Please try again.");
      }

      const exists = phoneDoc.exists();
      if (mode === "signin" && !exists) {
        throw new Error("No account found with this phone number. Please create an account.");
      }
      if (mode === "signup" && exists) {
        throw new Error("Account already exists. Please sign in.");
      }

      setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, fullPhone, (window as any).recaptchaVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setResendCooldown(true);
      setResendTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      let message = "Failed to send OTP";
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "auth/invalid-phone-number") message = "Invalid phone number";
        else if (code === "auth/too-many-requests") message = "Too many attempts. Please try again later.";
        else if (code === "auth/quota-exceeded") message = "SMS quota exceeded. Try again later.";
        else if (code?.includes("captcha-check-failed")) message = "Could not verify request. Please try again.";
        else if (code?.includes("missing-phone-number")) message = "Please enter a phone number";
        else if (code?.includes("invalid-verification")) message = "Verification failed. Try again.";
        else message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown) return;
    setOtpDigits(["", "", "", "", "", ""]);
    setOtp("");
    await handleSendOtp();
  }

  async function handleVerifyOtp() {
    setError("");
    const code = otpDigits.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(code);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (mode === "signin" && !userSnap.exists()) {
        await signOut(auth);
        throw new Error("Account not found. Please create an account.");
      }
      if (mode === "signup" && userSnap.exists()) {
        await signOut(auth);
        throw new Error("Account already exists. Please sign in.");
      }

      await setDoc(userRef, {
        name: name || result.user.displayName || "",
        email: result.user.email || "",
        phone: `+91${phone}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        onboarded: false,
      }, { merge: true });

      if (mode === "signup") {
        await setDoc(doc(db, "phoneNumbers", `+91${phone}`), { uid: result.user.uid });
      }

      localStorage.setItem("sellri_user", JSON.stringify({
        uid: result.user.uid,
        name: name || result.user.displayName || "",
        email: result.user.email || "",
      }));
      const snapAfter = await getDoc(userRef);
      const data = snapAfter.data();
      const onboarded = snapAfter.exists() && data?.onboarded === true;
      const hasPlan = snapAfter.exists() && !!data?.plan;
      router.push(!hasPlan ? "/choose-plan" : onboarded ? "/dashboard" : "/settings");
    } catch (err: unknown) {
      let message = "Invalid OTP";
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "auth/invalid-verification-code") message = "Incorrect OTP. Please try again.";
        else if (code === "auth/too-many-requests") message = "Too many attempts. Please try again later.";
        else if (code?.includes("expired")) message = "OTP has expired. Please request a new one.";
        else message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: "signin" | "signup") {
    setMode(m);
    setAuthMethod("email");
    setOtpSent(false);
    setOtp("");
    setOtpDigits(["", "", "", "", "", ""]);
    setConfirmationResult(null);
    setError("");
  }

  function switchAuthMethod(m: "email" | "phone") {
    setAuthMethod(m);
    setOtpSent(false);
    setOtp("");
    setOtpDigits(["", "", "", "", "", ""]);
    setConfirmationResult(null);
    setError("");
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let user;
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        if (name) {
          await updateProfile(cred.user, { displayName: name });
        }
        await setDoc(doc(db, "users", cred.user.uid), {
          name: name || "",
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          onboarded: false,
        });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      }
      localStorage.setItem("sellri_user", JSON.stringify({
        uid: user.uid,
        name: user.displayName || name || "",
        email: user.email,
      }));
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const udata = userDoc.data();
      const onboarded = userDoc.exists() && udata?.onboarded === true;
      const hasPlan = userDoc.exists() && !!udata?.plan;
      router.push(!hasPlan ? "/choose-plan" : onboarded ? "/dashboard" : "/settings");
    } catch (err: unknown) {
      let message = "Something went wrong";
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
          message = "Email or password is incorrect";
        } else if (code === "auth/invalid-email") {
          message = "Invalid email address";
        } else if (code === "auth/too-many-requests") {
          message = "Too many attempts. Please try again later.";
        } else if (code === "auth/user-disabled") {
          message = "This account has been disabled.";
        } else if (code === "auth/email-already-in-use") {
          message = "An account already exists with this email.";
        } else if (code === "auth/weak-password") {
          message = "Password should be at least 6 characters.";
        } else if (code === "auth/network-request-failed") {
          message = "Network error. Check your connection.";
        } else if (code === "auth/requires-recent-login") {
          message = "Please sign in again to continue.";
        } else if (code === "auth/operation-not-allowed") {
          message = "This sign-in method is not enabled.";
        } else {
          message = "Something went wrong. Please try again.";
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex flex-col md:flex-row">
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

          <section className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 md:p-12 bg-background pt-0 sm:pt-0 md:pt-0 lg:pt-0">
            <div className="w-full max-w-md">
              <div className="bg-surface-container-lowest p-4 sm:p-5 md:p-6 rounded-xl border border-outline-variant/30 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
              {/* Mode tabs */}
              <div className="flex p-1 bg-surface-container-low rounded-lg mb-6 sm:mb-8">
                <button
                  onClick={() => switchMode("signin")}
                  className={`flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-md font-label-md text-xs sm:text-label-md transition-all cursor-pointer ${
                    mode === "signin" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode("signup")}
                  className={`flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-md font-label-md text-xs sm:text-label-md transition-all cursor-pointer ${
                    mode === "signup" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <h3 className="font-headline-lg text-xl sm:text-2xl md:text-headline-lg text-on-surface mb-1 sm:mb-2">
                {mode === "signin" ? "Welcome Back" : "Create Account"}
              </h3>
              <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant mb-5 sm:mb-6 md:mb-8">
                {mode === "signin" ? "Please enter your details to sign in." : "Join the revolution of social commerce."}
              </p>

              {/* Auth method toggle */}
              <div className="flex gap-2 mb-6 sm:mb-8">
                <button
                  onClick={() => switchAuthMethod("email")}
                  className={`flex-1 py-2 px-3 rounded-lg font-label-md text-xs sm:text-label-sm transition-all cursor-pointer border ${
                    authMethod === "email"
                      ? "border-primary bg-primary-container/20 text-primary"
                      : "border-outline text-on-surface-variant hover:border-primary hover:text-primary"
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => switchAuthMethod("phone")}
                  className={`flex-1 py-2 px-3 rounded-lg font-label-md text-xs sm:text-label-sm transition-all cursor-pointer border ${
                    authMethod === "phone"
                      ? "border-primary bg-primary-container/20 text-primary"
                      : "border-outline text-on-surface-variant hover:border-primary hover:text-primary"
                  }`}
                >
                  Phone
                </button>
              </div>

              {authMethod === "phone" ? (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  {!otpSent ? (
                    <>
                      {mode === "signup" && (
                        <div>
                          <label className="block font-label-md text-sm sm:text-label-md text-on-surface mb-1 sm:mb-2">Full Name</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm sm:text-body-md"
                            placeholder="Rahul Sharma"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block font-label-md text-sm sm:text-label-md text-on-surface mb-1 sm:mb-2">Phone Number</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 sm:px-4 rounded-l-xl border border-r-0 border-outline bg-surface-container-low font-label-md text-sm sm:text-label-md text-on-surface-variant">
                            +91
                          </span>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-r-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm sm:text-body-md"
                            placeholder="9876543210"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-label-sm text-xs sm:text-label-sm text-red-600">
                          {error}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-label-md text-sm sm:text-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                        style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
                      >
                        {loading ? "Sending..." : "Send OTP"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block font-label-md text-sm sm:text-label-md text-on-surface mb-3 sm:mb-4">Enter OTP</label>
                        <div className="flex justify-center gap-2 sm:gap-3">
                          {otpDigits.map((digit, i) => (
                            <input
                              key={i}
                              ref={(el) => { otpRefs.current[i] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                const next = [...otpDigits];
                                next[i] = val;
                                setOtpDigits(next);
                                setOtp(next.join(""));
                                if (val && i < 5) otpRefs.current[i + 1]?.focus();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Backspace" && !digit && i > 0) otpRefs.current[i - 1]?.focus();
                                if (e.key === "Enter") handleVerifyOtp();
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white"
                            />
                          ))}
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-label-sm text-xs sm:text-label-sm text-red-600">
                          {error}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-label-md text-sm sm:text-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                        style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
                      >
                        {loading ? "Verifying..." : "Verify OTP"}
                      </button>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtp(""); setOtpDigits(["", "", "", "", "", ""]); setConfirmationResult(null); setError(""); }}
                          className="font-label-sm text-xs sm:text-label-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
                        >
                          Change phone number
                        </button>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown}
                          className="font-label-sm text-xs sm:text-label-sm text-primary hover:underline disabled:text-on-surface-variant disabled:no-underline cursor-pointer bg-transparent border-none"
                        >
                          {resendCooldown ? `Resend in ${resendTimer}s` : "Resend OTP"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                  {mode === "signup" && (
                    <div>
                      <label className="block font-label-md text-sm sm:text-label-md text-on-surface mb-1 sm:mb-2">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm sm:text-body-md"
                        placeholder="Rahul Sharma"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-label-md text-sm sm:text-label-md text-on-surface mb-1 sm:mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm sm:text-body-md"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 sm:mb-2">
                      <label className="block font-label-md text-sm sm:text-label-md text-on-surface">Password</label>
                      {mode === "signin" && (
                        <Link href="#" tabIndex={-1} className="font-label-sm text-[10px] sm:text-label-sm font-semibold text-primary hover:underline">Forgot password?</Link>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm sm:text-body-md"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant cursor-pointer text-xl sm:text-2xl"
                      >
                        {showPassword ? "visibility_off" : "visibility"}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-label-sm text-xs sm:text-label-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-label-md text-sm sm:text-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                    style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
                  >
                    {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
                  </button>
                </form>
              )}

              <div id="recaptcha-container" ref={recaptchaContainerRef} />

              <p className="mt-5 sm:mt-6 md:mt-8 text-center font-label-sm text-[10px] sm:text-label-sm text-on-surface-variant">
                By continuing, you agree to Sellri&apos;s{" "}
                <Link href="#" className="text-primary hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}