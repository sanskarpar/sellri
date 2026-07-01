"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PLANS = [
  { key: "1month", label: "1 Month", price: 59, per: "/mo", subtitle: "Billed monthly", badge: true },
  { key: "3months", label: "3 Months", price: 149, per: "", subtitle: "₹49.6/mo — Save 16%", badge: false },
  { key: "6months", label: "6 Months", price: 249, per: "", subtitle: "₹41.5/mo — Save 30%", badge: false },
  { key: "12months", label: "12 Months", price: 449, per: "", subtitle: "₹37.4/mo — Save 37%", badge: true },
];

export default function ChoosePlanPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [isActiveTrial, setIsActiveTrial] = useState(false);
  const [isRenewal, setIsRenewal] = useState(false);
  const [currentEndMs, setCurrentEndMs] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sellri_user");
    if (!stored) { router.replace("/signin"); return; }
    let u: { uid: string };
    try { u = JSON.parse(stored); } catch { router.replace("/signin"); return; }
    setUid(u.uid);

    getDoc(doc(db, "users", u.uid)).then((snap) => {
      if (!snap.exists()) {
        setTrialAvailable(true);
        setChecking(false);
        return;
      }
      const data = snap.data();
      const plan = data?.plan;
      const trialEnd = data?.trialEndsAt;
      const now = Date.now();
      const trialExpired = trialEnd && (trialEnd.toMillis ? trialEnd.toMillis() : trialEnd.seconds * 1000) < now;

      if (plan === "paid") {
        // Existing subscriber — show renewal options
        setIsRenewal(true);
        if (data?.subscriptionEndsAt) {
          setCurrentEndMs(data.subscriptionEndsAt.toMillis ? data.subscriptionEndsAt.toMillis() : data.subscriptionEndsAt.seconds * 1000);
        }
        setTrialAvailable(false);
        setChecking(false);
        return;
      }
      // Allow trial users to subscribe — subscription extends after trial ends
      setTrialAvailable(false);
      if (plan === "trial" && !trialExpired) setIsActiveTrial(true);
      setChecking(false);
    }).catch(() => setChecking(false));

    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => setRazorpayLoaded(true);
      document.body.appendChild(script);
    } else {
      setRazorpayLoaded(true);
    }
  }, [router]);

  async function handleFreeTrial() {
    if (!uid) return;
    setBusy(true);
    try {
      await setDoc(doc(db, "users", uid), {
        plan: "trial",
        trialStartedAt: Timestamp.now(),
        trialEndsAt: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        updatedAt: Timestamp.now(),
      }, { merge: true });
      router.push("/settings");
    } catch {
      alert("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  async function handleSubscribe() {
    if (!uid || !selectedPlan) return;
    setBusy(true);
    try {
      const planConfig = PLANS.find((p) => p.key === selectedPlan);
      if (!planConfig) { setBusy(false); return; }
      if (!razorpayLoaded) { alert("Payment is loading. Please wait."); setBusy(false); return; }

      const res = await fetch("/api/create-subscription-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, planKey: planConfig.key, amount: planConfig.price }),
      });
      const data = await res.json();
      if (!res.ok || !data.orderId) {
        alert(data.error === "Razorpay not configured" ? "Payment setup incomplete. Use free trial for now." : data.error || "Failed");
        setBusy(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        amount: planConfig.price * 100,
        currency: "INR",
        name: "Sellri",
        description: `${planConfig.label} Plan`,
        order_id: data.orderId,
        handler(response: any) {
          (async () => {
            try {
              const r = await fetch("/api/create-subscription-order", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  uid,
                  planKey: planConfig.key,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const d = await r.json();
              if (d.success) {
                // Extend subscription — read current end date / trial end date and add duration
                const snap = await getDoc(doc(db, "users", uid));
                const existingEnd = snap.data()?.subscriptionEndsAt;
                const trialEnd = snap.data()?.trialEndsAt;
                const now = new Date();
                let base = now;
                if (existingEnd) {
                  const existingMs = existingEnd.toMillis ? existingEnd.toMillis() : existingEnd.seconds * 1000;
                  base = new Date(Math.max(existingMs, now.getTime()));
                } else if (trialEnd) {
                  const trialMs = trialEnd.toMillis ? trialEnd.toMillis() : trialEnd.seconds * 1000;
                  base = new Date(Math.max(trialMs, now.getTime()));
                }
                const end = new Date(base.getTime() + d.durationDays * 24 * 60 * 60 * 1000);
                await setDoc(doc(db, "users", uid), {
                  plan: "paid",
                  subscriptionPlan: d.planKey,
                  subscriptionStartedAt: Timestamp.fromDate(now),
                  subscriptionEndsAt: Timestamp.fromDate(end),
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  updatedAt: Timestamp.now(),
                }, { merge: true });
                    router.push("/settings");
                  } else {
                    alert(d.error || "Verification failed");
                  }
                } catch {
                  alert("Verification failed");
                } finally {
                  setBusy(false);
                }
              })();
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: "#f68f1d" },
      });
      rzp.on("payment.failed", () => setBusy(false));
      rzp.open();
    } catch {
      alert("Payment failed.");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface via-surface to-primary-fixed/20">
        <div className="w-8 h-8 border-4 border-[#f68f1d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface to-primary-fixed/20 relative">
      {/* Processing overlay */}
      {busy && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-[300px]">
            <div className="w-10 h-10 border-4 border-[#f68f1d] border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface font-semibold text-sm text-center">Processing payment…</p>
            <p className="text-on-surface-variant text-xs text-center">Please do not close this page.</p>
          </div>
        </div>
      )}
      <div className="w-full py-12 md:py-20">
        <div className="max-w-[420px] mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-display-lg text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
              {isRenewal ? "Renew your plan" : "Subscribe now"}
            </h1>
            <p className="text-on-surface-variant mt-2 text-sm md:text-base max-w-[360px] mx-auto">
              {isRenewal
                ? "Extend your subscription. Pick a plan below."
                : "Pick a plan to continue after your free trial."}
            </p>
          </div>

          {isRenewal && currentEndMs && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
              <p className="font-medium">
                You have an active subscription until{" "}
                {new Date(currentEndMs).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
              </p>
              <p className="mt-1">
                Renewing will <strong>extend</strong> your plan from that date — no time is lost.
              </p>
            </div>
          )}

          {/* Pricing Card */}
          <div className="relative rounded-3xl border-2 border-primary/20 bg-white mb-6">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg whitespace-nowrap" style={{ backgroundColor: "#f68f1d" }}>
              {isRenewal ? "Renew" : trialAvailable ? "Get Started" : isActiveTrial ? "Subscribe" : "Reactivate"}
            </div>
            <div className="pt-8 pb-6 px-5">
              {trialAvailable && (
                <>
                  {/* Free Trial */}
                  <div className="text-center mb-6">
                    <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">Free Trial</p>
                    <p className="text-3xl font-extrabold text-on-surface tracking-tight">₹0</p>
                    <p className="text-on-surface-variant text-sm mt-1">14 days free — no payment needed</p>
                  </div>
                  <button
                    onClick={handleFreeTrial}
                    disabled={busy}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer mb-2"
                    style={{ backgroundColor: "#f68f1d" }}
                  >
                    {busy ? "Starting..." : "Start Free Trial"}
                  </button>
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-outline-variant/50" />
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">or subscribe</span>
                    <div className="flex-1 h-px bg-outline-variant/50" />
                  </div>
                </>
              )}

              {/* Plan selection */}
              <div className="text-center mb-5">
                <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">Professional Plan</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold text-on-surface tracking-tight">₹59</span>
                  <span className="text-on-surface-variant text-sm">/month</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {PLANS.map((plan) => {
                  const sel = selectedPlan === plan.key;
                  return (
                    <button
                      key={plan.key}
                      onClick={() => setSelectedPlan(plan.key)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left cursor-pointer ${
                        sel ? "border-[#f68f1d] bg-orange-50" : "border-outline-variant/40 hover:border-outline-variant"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "border-[#f68f1d]" : "border-outline-variant"}`}>
                          {sel && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f68f1d" }} />}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-on-surface">{plan.label}</span>
                          {plan.badge && (
                            <span className="ml-1.5 text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full align-middle">Best value</span>
                          )}
                          <p className="text-[11px] text-on-surface-variant">{plan.subtitle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-on-surface">₹{plan.price}</span>
                        {plan.per && <span className="text-[11px] text-on-surface-variant">{plan.per}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={!selectedPlan || busy}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: "#f68f1d" }}
              >
                {busy ? "Processing..." : selectedPlan ? `Pay ₹${PLANS.find(p => p.key === selectedPlan)?.price}` : "Select a plan above"}
              </button>

              {!trialAvailable && !isActiveTrial && !isRenewal && (
                <p className="text-center text-xs text-on-surface-variant mt-3">
                  Your free trial has ended. Subscribe to continue using Sellri.
                </p>
              )}
              {isActiveTrial && (
                <p className="text-center text-xs text-on-surface-variant mt-3">
                  Your subscription will take effect after your free trial ends.
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="rounded-2xl border border-outline-variant/30 bg-white p-5">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">All plans include</p>
            <div className="space-y-2.5">
              {["Unlimited Products", "WhatsApp Order Integration", "Custom Store URL", "Inventory Management", "No Transaction Fees"].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xs">check_circle</span>
                  </div>
                  <span className="text-sm text-on-surface">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
