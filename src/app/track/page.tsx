"use client";

import { useState, useRef, useEffect } from "react";
import { doc, getDoc, collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";

const STATUSES = ["Received", "Paid", "Out for Delivery", "Delivered"] as const;

type OrderData = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  status: string;
  items: { productName: string; quantity: number; price: number }[];
  createdAt?: string;
};

type SearchMethod = "email" | "reference";

export default function TrackPage() {
  const [method, setMethod] = useState<SearchMethod>("email");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");

  const [searching, setSearching] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [specificOrder, setSpecificOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");

  const [showOtp, setShowOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTarget, setOtpTarget] = useState("");

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (showOtp && !otpSent && !sendingOtp && !otpVerified) {
      handleSendOtp();
    }
  }, [showOtp]);

  function reset() {
    setOrders([]);
    setSpecificOrder(null);
    setError("");
    setShowOtp(false);
    setOtpSent(false);
    setOtp("");
    setOtpVerified(false);
    setOtpError("");
  }

  async function findOrders() {
    reset();
    setSearching(true);

    try {
      let q;

      if (method === "email") {
        q = query(
          collectionGroup(db, "orders"),
          where("customerEmail", "==", email.toLowerCase().trim())
        );
      } else {
        const ref = reference.startsWith("#") ? reference : `#${reference.toUpperCase()}`;
        q = query(
          collectionGroup(db, "orders"),
          where("reference", "==", ref)
        );
      }

      const snap = await getDocs(q);
      const allOrders: OrderData[] = [];

      snap.forEach((d) => {
        const data = d.data();
        const match = method !== "reference" ||
          (!phone || data.customerPhone === phone.trim()) &&
          (!email || data.customerEmail === email.toLowerCase().trim());
        if (!match) return;
        allOrders.push({
          id: d.id,
          reference: data.reference,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          total: data.total,
          status: data.status,
          items: data.items || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        });
      });

      if (allOrders.length === 0) {
        setError("No orders found with those details.");
        return;
      }

      if (method === "reference") {
        setSpecificOrder(allOrders[0]);
        setOtpVerified(true);
      } else {
        setOrders(allOrders);
        setOtpTarget(allOrders[0].customerEmail);
        setShowOtp(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSendOtp() {
    setSendingOtp(true);
    setOtpError("");

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: otpTarget }),
      });
      const d = await res.json();
      if (!res.ok) { setOtpError(d.error || "Failed to send OTP"); return; }
      setOtpSent(true);
      setResendCooldown(60);
    } catch {
      setOtpError("Failed to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) return;
    setVerifying(true);
    setOtpError("");

    try {
      const key = `${otpTarget}_${otp.trim()}`;
      const snap = await getDoc(doc(db, "otps", key));
      if (!snap.exists() || snap.data().used || new Date(snap.data().expiresAt) < new Date()) {
        setOtpError("Invalid or expired OTP");
        return;
      }
      setOtpVerified(true);
    } catch {
      setOtpError("Invalid OTP");
    } finally {
      setVerifying(false);
    }
  }

  const displayOrders = specificOrder ? [specificOrder] : orders;
  const showSearchForm = !(specificOrder || orders.length > 0) && !otpVerified;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface">
        <div className="max-w-lg mx-auto px-4 py-12">

          {showSearchForm ? (
            <>
              <div className="text-center mb-6">
                <span className="material-symbols-outlined text-5xl mb-2" style={{ color: "#ff6b35", fontSize: 48 }}>search</span>
                <h1 className="font-headline-md text-2xl text-on-surface font-semibold">Track Your Order</h1>
                <p className="text-on-surface-variant text-sm mt-1">Find your orders using email or reference number.</p>
              </div>

              <div className="flex border-b border-outline-variant/30 mb-6">
                {(["email", "reference"] as const).map((m) => (
                  <button key={m} onClick={() => { setMethod(m); reset(); }} className={`flex-1 py-3 text-sm font-label-md capitalize transition-all cursor-pointer relative ${method === m ? "font-semibold" : "text-on-surface-variant hover:text-on-surface"}`} style={method === m ? { color: "#ff6b35" } : {}}>
                    {m === "reference" ? "Ref + Contact" : "Email"}
                    {method === m && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#ff6b35" }} />}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                {method === "email" && (
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1.5">Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm" />
                    <p className="text-xs text-on-surface-variant mt-1.5">We'll send an OTP to your email.</p>
                  </div>
                )}

                {method === "reference" && (
                  <>
                    <div>
                      <label className="block font-label-md text-sm text-on-surface mb-1.5">Reference Number</label>
                      <input type="text" value={reference} onChange={(e) => setReference(e.target.value.toUpperCase().replace(/[^A-Z0-9#]/g, "").slice(0, 9))} placeholder="#SLXXXXXX" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm" />
                    </div>
                    <div>
                      <label className="block font-label-md text-sm text-on-surface mb-1.5">Phone or Email</label>
                      <input type="text" value={phone || email} onChange={(e) => { const v = e.target.value; if (v.includes("@")) { setEmail(v); setPhone(""); } else { setPhone(v.replace(/\D/g, "").slice(0, 10)); setEmail(""); } }} placeholder="9876543210 or you@example.com" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm" />
                    </div>
                  </>
                )}

                <button onClick={findOrders} disabled={searching || (method === "email" && !email.trim()) || (method === "reference" && (!reference.trim() || (!phone.trim() && !email.trim())))} className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2" style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}>
                  {searching ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching...</span>
                  ) : (
                    <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span> Find Order{method === "email" ? "s" : ""}</>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-3">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18 }}>error</span>
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              {!otpVerified ? (
                <>
                  <div className="text-center mb-6">
                    <span className="material-symbols-outlined text-4xl mb-2" style={{ color: "#ff6b35", fontSize: 40 }}>lock</span>
                    <h1 className="font-headline-md text-xl text-on-surface font-semibold">Verify Your Identity</h1>
                    <p className="text-on-surface-variant text-sm mt-1">We found your orders. Verify to view details.</p>
                    <p className="text-xs text-on-surface-variant mt-1">OTP sent to <strong className="text-on-surface">{otpTarget}</strong></p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                    {sendingOtp ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-on-surface-variant">
                        <span className="w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
                        Sending OTP...
                      </div>
                    ) : !otpSent ? (
                      <div className="text-center py-2 text-sm text-red-500">
                        Failed to send OTP. <button onClick={handleSendOtp} className="text-primary underline cursor-pointer">Retry</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter OTP" maxLength={6} className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm text-center text-2xl tracking-[8px]" />
                        </div>
                        <button onClick={handleVerifyOtp} disabled={verifying || otp.length !== 6} className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer" style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}>
                          {verifying ? "Verifying..." : "Verify OTP"}
                        </button>
                        <button onClick={() => { if (resendCooldown === 0) { setOtpSent(false); setOtp(""); } }} disabled={resendCooldown > 0} className="w-full text-sm text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline text-center">
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                        </button>
                      </div>
                    )}
                  </div>

                  <button onClick={reset} className="mt-4 w-full py-3 rounded-xl font-label-md text-on-surface-variant border border-outline hover:text-on-surface transition-all cursor-pointer">
                    Back to Search
                  </button>

                  {otpError && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                      <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16 }}>error</span>
                      {otpError}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <span className="material-symbols-outlined text-4xl mb-2" style={{ color: "#22c55e", fontSize: 40 }}>verified</span>
                    <h1 className="font-headline-md text-xl text-on-surface font-semibold">
                      {specificOrder ? "Order Details" : `Your Orders (${displayOrders.length})`}
                    </h1>
                  </div>

                  <div className="space-y-4">
                    {displayOrders.map((order) => (
                      <div key={order.id} className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-outline-variant/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-on-surface-variant">Reference</p>
                              <p className="font-bold text-primary">{order.reference}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              order.status === "Delivered" ? "bg-green-100 text-green-600" :
                              order.status === "Out for Delivery" ? "bg-orange-100 text-orange-600" :
                              order.status === "Paid" ? "bg-blue-100 text-blue-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>{order.status}</span>
                          </div>
                        </div>
                        <div className="px-6 py-4 space-y-3">
                          <p className="font-label-md text-sm text-on-surface"><span className="text-on-surface-variant">Customer:</span> {order.customerName}</p>
                          {order.items && order.items.length > 0 && (
                            <div>
                              <p className="text-xs text-on-surface-variant mb-2 font-semibold uppercase tracking-wider">Items</p>
                              {order.items.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                                  <span className="text-on-surface">{item.productName} <span className="text-on-surface-variant">x{item.quantity}</span></span>
                                  <span className="font-semibold text-on-surface">₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="border-t border-outline-variant/10 pt-3 flex items-center justify-between">
                            <span className="font-label-md text-on-surface font-semibold">Total</span>
                            <span className="font-bold text-primary text-lg">₹{order.total}</span>
                          </div>
                        </div>
                        <div className="px-6 py-4 border-t border-outline-variant/20">
                          <div className="flex items-center gap-1">
                            {STATUSES.map((s, i) => {
                              const currentIdx = STATUSES.indexOf(order.status as any);
                              const isDone = currentIdx >= i;
                              const isCurrent = order.status === s;
                              return (
                                <div key={s} className="flex items-center flex-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? "text-white shadow-md" : isDone ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                                    style={isCurrent ? { backgroundColor: "#ff6b35" } : {}}
                                  >
                                    {isDone ? "✓" : i + 1}
                                  </div>
                                  <span className="text-[10px] ml-1 text-on-surface-variant truncate">{s}</span>
                                  {i < STATUSES.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-1 ${currentIdx > i ? "bg-green-400" : "bg-gray-200"}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => { reset(); setOtpSent(false); setOtpVerified(false); }} className="mt-6 w-full py-3 rounded-xl font-label-md text-on-surface-variant border border-outline hover:text-on-surface transition-all cursor-pointer">
                    Track Another Order
                  </button>
                </>
              )}
            </>
          )}

        </div>
      </main>
    </>
  );
}
