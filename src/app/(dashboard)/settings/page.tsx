"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, linkWithCredential } from "firebase/auth";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    || "store";
}

async function slugExists(slug: string, excludeUid: string): Promise<boolean> {
  const q = query(collection(db, "users"), where("slug", "==", slug));
  const snap = await getDocs(q);
  return snap.docs.some((d) => d.id !== excludeUid);
}

const PLAN_LABELS: Record<string, string> = {
  "1month": "1 Month Plan",
  "3months": "3 Months Plan",
  "6months": "6 Months Plan",
  "12months": "12 Months Plan",
};

function getPlanLabel(key?: string): string {
  return key ? PLAN_LABELS[key] || "Paid Plan" : "Paid Plan";
}

function formatDate(ts: { toMillis?: () => number; seconds: number }): string {
  const d = new Date(ts.toMillis ? ts.toMillis() : ts.seconds * 1000);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"store" | "preferences" | "orders">("store");
  const [tab, setTab] = useState<"store" | "preferences" | "orders" | "account">("store");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [hasPasswordAuth, setHasPasswordAuth] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [orderMethod, setOrderMethod] = useState<"whatsapp" | "instagram" | "razorpay">("whatsapp");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [instagram, setInstagram] = useState("");
  const [makeToOrder, setMakeToOrder] = useState(false);

  const [deliveryType, setDeliveryType] = useState<"none" | "flat">("none");
  const [deliveryFlatFee, setDeliveryFlatFee] = useState("");
  const [deliveryFreeThresholdEnabled, setDeliveryFreeThresholdEnabled] = useState(false);
  const [deliveryFreeThreshold, setDeliveryFreeThreshold] = useState("");

  const [customerFields, setCustomerFields] = useState({
    name: true,
    phone: false,
    email: false,
    address: false,
    message: false,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [plan, setPlan] = useState<string | null>(null);
  const [planBanner, setPlanBanner] = useState<{ type: "trial" | "expired" | "paid"; message: string } | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initialLoad = useRef(true);

  const hasEmail = !!(user?.email);
  const hasPhone = !!(userDoc?.phone);
  const loggedInViaPhone = !hasEmail;

  useEffect(() => {
    const stored = localStorage.getItem("sellri_user");
    if (!stored) { router.push("/signin"); return; }
    const u = JSON.parse(stored);
    setUser(u);
    const fetchDoc = async () => {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserDoc(data);
        setStoreName(data.name || "");
        setStoreSlug(data.slug || generateSlug(data.name || u.name || "store"));
        setBio(data.bio || "");
        setWhatsapp(data.whatsapp || "");
        setNewEmail(data.email || u.email || "");
        setNewPhone(data.phone || "");
        setOrderMethod(data.orderMethod || "whatsapp");
        setRazorpayKeyId(data.razorpayKeyId || "");
        setRazorpayKeySecret(data.razorpayKeySecret || "");
        setInstagram(data.instagram || "");
        setMakeToOrder(data.makeToOrder ?? false);
        setDeliveryType(data.delivery?.type === "flat" ? "flat" : "none");
        setDeliveryFlatFee(data.delivery?.flatFee?.toString() || "");
        setDeliveryFreeThresholdEnabled((data.delivery?.freeThreshold ?? 0) > 0);
        setDeliveryFreeThreshold(data.delivery?.freeThreshold?.toString() || "");
        setCustomerFields({
          name: data.customerFields?.name ?? true,
          phone: data.customerFields?.phone ?? false,
          email: data.customerFields?.email ?? false,
          address: data.customerFields?.address ?? false,
          message: data.customerFields?.message ?? false,
        });
        if (data.onboarded !== true) setIsFirstTime(true);

        // Plan status
        const p = data?.plan;
        const now = Date.now();
        if (p === "trial" && data?.trialEndsAt) {
          const end = data.trialEndsAt.toMillis ? data.trialEndsAt.toMillis() : data.trialEndsAt.seconds * 1000;
          const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 0) {
            setPlanBanner({ type: "expired", message: "Your free trial has ended. Subscribe to keep your store active." });
          } else {
            setPlanBanner({ type: "trial", message: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial` });
          }
          setPlan(p);
        } else if (p === "paid" && data?.subscriptionEndsAt) {
          const end = data.subscriptionEndsAt.toMillis ? data.subscriptionEndsAt.toMillis() : data.subscriptionEndsAt.seconds * 1000;
          if (now > end) {
            setPlanBanner({ type: "expired", message: "Your subscription has expired. Renew to keep your store active." });
          } else {
            setPlanBanner({ type: "paid", message: `${data.subscriptionPlan || "Plan"} active` });
          }
          setPlan(p);
        } else if (p === "expired") {
          setPlanBanner({ type: "expired", message: "Your plan has expired. Subscribe to reactivate your store." });
          setPlan(p);
        }
      }
      const cu = auth.currentUser;
      if (cu) setHasPasswordAuth(cu.providerData?.some((p) => p.providerId === "password") ?? false);
      setLoading(false);
    };
    fetchDoc();
  }, [router]);

  // Auto-generate slug from store name (skip on initial data load)
  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; return; }
    if (!slugManuallyEdited && storeName) {
      setStoreSlug(generateSlug(storeName));
    }
  }, [storeName, slugManuallyEdited]);

  async function handleSaveStore() {
    if (!user) return;
    setError(""); setMessage(""); setSaving(true);
    try {
      // Validate slug
      let slug = storeSlug.trim().toLowerCase();
      if (!slug) slug = generateSlug(storeName || "store");
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        setError("Store URL can only contain lowercase letters, numbers, and hyphens.");
        setSaving(false);
        return;
      }
      if (await slugExists(slug, user.uid)) {
        setError("This store URL is already taken. Please choose another.");
        setSaving(false);
        return;
      }

      const updates: Record<string, any> = {
        name: storeName,
        slug,
        bio,
        onboarded: true,
        updatedAt: serverTimestamp(),
      };
      if (loggedInViaPhone && newEmail) updates.email = newEmail;
      if (!hasPhone && newPhone) updates.phone = newPhone;
      await updateDoc(doc(db, "users", user.uid), updates);
      localStorage.setItem("sellri_user", JSON.stringify({
        ...user,
        email: loggedInViaPhone ? newEmail : user.email,
        name: storeName,
      }));
      setMessage("Store saved!");
      if (isFirstTime) setStep("preferences");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences() {
    if (!user) return;
    setError(""); setMessage(""); setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        makeToOrder,
        updatedAt: serverTimestamp(),
      });
      setMessage("Preferences saved!");
      if (isFirstTime) setStep("orders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePayments() {
    if (!user) return;
    setError(""); setMessage(""); setSaving(true);
    try {
      if (orderMethod === "whatsapp" && !whatsapp.trim()) {
        setError("Please enter your WhatsApp number to receive orders.");
        setSaving(false);
        return;
      }
      if (orderMethod === "instagram" && !instagram.trim()) {
        setError("Please enter your Instagram username to receive orders.");
        setSaving(false);
        return;
      }
      const delivery = orderMethod === "razorpay" ? {
        type: deliveryType,
        flatFee: deliveryType === "flat" ? Number(deliveryFlatFee) || 0 : 0,
        freeThreshold: deliveryType === "flat" && deliveryFreeThresholdEnabled ? Number(deliveryFreeThreshold) || 0 : 0,
      } : { type: "none", flatFee: 0, freeThreshold: 0 };
      await updateDoc(doc(db, "users", user.uid), {
        orderMethod,
        whatsapp: orderMethod === "whatsapp" ? whatsapp : "",
        instagram: orderMethod === "instagram" ? instagram : "",
        razorpayKeyId: orderMethod === "razorpay" ? razorpayKeyId : "",
        razorpayKeySecret: orderMethod === "razorpay" ? razorpayKeySecret : "",
        delivery,
        customerFields: orderMethod === "razorpay" ? customerFields : { name: true, phone: false, email: false, address: false, message: false },
        updatedAt: serverTimestamp(),
      });
      setMessage("Payment settings saved!");
      if (isFirstTime) {
        await updateDoc(doc(db, "users", user!.uid), { onboarded: true, updatedAt: serverTimestamp() });
        router.push("/dashboard");
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(""); setPasswordMsg("");
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    if (!newEmail) { setPasswordError("No email address found. Add one in your Store tab."); return; }
    setSaving(true);
    try {
      if (hasPasswordAuth) {
        if (!currentPassword) { setPasswordError("Current password is required"); setSaving(false); return; }
        const credential = EmailAuthProvider.credential(auth.currentUser!.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser!, credential);
        await updatePassword(auth.currentUser!, newPassword);
        setPasswordMsg("Password changed successfully!");
      } else {
        const credential = EmailAuthProvider.credential(newEmail, newPassword);
        await linkWithCredential(auth.currentUser!, credential);
        setPasswordMsg("Password set successfully! You can now sign in with your email.");
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  const steps = ["store", "preferences", "orders"] as const;

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6">
      {isFirstTime && (
        <div className="text-center mb-8">
          <h1 className="font-display-lg text-3xl md:text-4xl text-on-surface mb-2">Welcome to Sellri!</h1>
          <p className="text-on-surface-variant">Let&apos;s set up your store in a few steps.</p>
        </div>
      )}

      {isFirstTime && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? "bg-primary text-white" :
                steps.indexOf(step) > i ? "bg-green-500 text-white" : "bg-outline-variant/30 text-on-surface-variant"
              }`}>
                {steps.indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-12 h-0.5 ${steps.indexOf(step) > i ? "bg-green-500" : "bg-outline-variant/30"}`} />}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="fixed top-6 right-6 z-[100] bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 font-label-sm text-red-600 shadow-lg" style={{ animation: "slideInRight 0.2s ease-out" }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        </div>
      )}
      {message && (
        <div className="fixed top-6 right-6 z-[100] bg-green-50 border border-green-200 rounded-xl px-5 py-3.5 font-label-sm text-green-600 shadow-lg" style={{ animation: "slideInRight 0.2s ease-out" }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-green-500" style={{ fontSize: 18 }}>check_circle</span>
            {message}
          </div>
        </div>
      )}

      {/* ── Tab Navigation (settings only) ───────────────────────────── */}
      {!isFirstTime && (
        <div className="flex border-b border-outline-variant/30 mb-6 overflow-x-auto">
          {(["store", "preferences", "orders", "account"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 font-label-md capitalize whitespace-nowrap transition-all cursor-pointer relative ${
                tab === t ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "store" ? "Store" : t === "preferences" ? "Preferences" : t === "orders" ? "Payments" : "Account"}
              {tab === t && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#ff6b35" }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Store Card (onboarding step or settings tab) ─────────────── */}
      {(step === "store" && isFirstTime) || (tab === "store" && !isFirstTime) ? (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
          {isFirstTime && <h2 className="font-headline-md text-xl text-on-surface mb-6">Store Details</h2>}

          <div className="md:grid md:grid-cols-1 md:gap-x-8 space-y-5 md:space-y-0">
            <div className="space-y-5">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Store Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="Rahul's Store"
                />
              </div>

              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Store URL</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-sm text-on-surface-variant shrink-0">sellri.in/</span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md min-w-0"
                    placeholder="rahuls-store"
                  />
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Auto-generated from your store name. You can customise it.</p>
              </div>

              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">
                  {loggedInViaPhone ? "Email Address" : "Email"}
                </label>
                {loggedInViaPhone ? (
                  <>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                      placeholder="name@example.com"
                    />
                    <p className="text-xs text-on-surface-variant mt-1">Used for order notifications.</p>
                  </>
                ) : (
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-outline bg-surface-container-low text-on-surface-variant font-body-md cursor-not-allowed"
                  />
                )}
              </div>

              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Phone Number</label>
                {hasPhone ? (
                  <input
                    type="tel"
                    value={userDoc?.phone || ""}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-outline bg-surface-container-low text-on-surface-variant font-body-md cursor-not-allowed"
                  />
                ) : (
                  <div>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-outline bg-surface-container-low font-label-md text-on-surface-variant">+91</span>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="w-full px-4 py-3 rounded-r-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                        placeholder="9876543210"
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">Used for order notifications.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row - full width on both columns */}
            <div className="md:col-span-2 space-y-5">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Store Description</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md resize-none"
                  placeholder="Tell your customers what you sell..."
                />
                <p className="text-xs text-on-surface-variant mt-1 text-right">{bio.length}/500</p>
              </div>

            </div>
          </div>

          <div className="flex gap-3 mt-8">
            {isFirstTime ? (
              <>
                <button
                  onClick={handleSaveStore}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </button>
              </>
            ) : (
              <button
                onClick={handleSaveStore}
                disabled={saving}
                className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Preferences Card ─────────────────────────────────────────── */}
      {(step === "preferences" && isFirstTime) || (tab === "preferences" && !isFirstTime) ? (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
          <h2 className="font-headline-md text-xl text-on-surface mb-2">Store Preferences</h2>
          <p className="text-on-surface-variant mb-6">Customise how your store works.</p>

          {/* Store Preferences */}
          <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
            <h3 className="font-label-md font-semibold text-on-surface">Ordering</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label-md text-sm text-on-surface">Make to order</p>
                <p className="text-xs text-on-surface-variant">Disable stock tracking &mdash; treat all products as in stock (ideal for made-to-order businesses).</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <div
                  onClick={() => setMakeToOrder(!makeToOrder)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${makeToOrder ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: makeToOrder ? "translateX(20px)" : "translateX(0)" }}
                  />
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleSavePreferences} disabled={saving}
            className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
          >
            {saving ? "Saving..." : isFirstTime ? "Save & Continue" : "Save Changes"}
          </button>
        </div>
      ) : null}

      {/* ── Payments Card ─────────────────────────────────────────────── */}
      {(step === "orders" && isFirstTime) || (tab === "orders" && !isFirstTime) ? (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
          <h2 className="font-headline-md text-xl text-on-surface mb-2">Payment Settings</h2>
          <p className="text-on-surface-variant mb-6">Configure how customers pay on your store.</p>

          <h3 className="font-label-md font-semibold text-on-surface mb-4">Payment Method</h3>
          <div className="space-y-4 mb-6">
            {(["whatsapp", "instagram", "razorpay"] as const).map((method) => (
              <label key={method} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                orderMethod === method ? "border-primary bg-primary-container/5" : "border-outline hover:border-primary"
              }`}>
                <input
                  type="radio" name="orderMethod" value={method}
                  checked={orderMethod === method}
                  onChange={() => setOrderMethod(method)}
                  className="mt-1 accent-primary"
                />
                <div>
                  <p className="font-label-md font-bold text-on-surface">
                    {method === "whatsapp" ? "WhatsApp Orders" : method === "instagram" ? "Instagram Orders" : "In-App Payments (Razorpay)"}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {method === "whatsapp"
                      ? "Customers send orders directly to your WhatsApp. Simple and personal."
                      : method === "instagram"
                      ? "Customers DM their orders to your Instagram. Great for social selling."
                      : "Customers pay directly on your store page via UPI, cards & more."}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {orderMethod === "whatsapp" && (
            <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">WhatsApp Number <span className="text-red-500">*</span></label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-outline bg-surface-container-low font-label-md text-on-surface-variant">+91</span>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full px-4 py-3 rounded-r-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                    placeholder="9876543210"
                  />
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Required. Customers will send orders here.</p>
              </div>
            </div>
          )}

          {orderMethod === "instagram" && (
            <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Instagram Username <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30))}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="yourstore"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Required. Customers will DM you at <strong>instagram.com/{instagram || "yourstore"}</strong>
                </p>
              </div>
            </div>
          )}

          {orderMethod === "razorpay" && (
            <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-bold mb-1">How to get your Razorpay API keys:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" className="underline">Razorpay Dashboard</a></li>
                  <li>Navigate to <strong>Settings → API Keys</strong></li>
                  <li>Click <strong>Generate Key</strong></li>
                  <li>Copy the <strong>Key ID</strong> and <strong>Key Secret</strong>, then paste below</li>
                </ol>
              </div>
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Razorpay Key ID</label>
                <input
                  type="text" value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value.trim())}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="rzp_live_xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Razorpay Key Secret</label>
                <input
                  type="password" value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value.trim())}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="xxxxxxxxxxxxxxxx"
                />
              </div>
            </div>
          )}

          {orderMethod === "razorpay" && (
            <>
              {/* Delivery Settings */}
              <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
                <h3 className="font-label-md font-semibold text-on-surface">Delivery</h3>
                <div className="space-y-3">
                  {(["none", "flat"] as const).map((t) => (
                    <label key={t} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      deliveryType === t ? "border-primary bg-primary-container/5" : "border-outline hover:border-primary"
                    }`}>
                      <input
                        type="radio" name="deliveryType" value={t}
                        checked={deliveryType === t}
                        onChange={() => setDeliveryType(t)}
                        className="mt-1 accent-primary"
                      />
                      <div>
                        <p className="font-label-md font-bold text-on-surface text-sm">
                          {t === "none" ? "No Delivery Fee" : "Flat Delivery Price"}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {t === "none" ? "No delivery charges added." : "A fixed fee for every order."}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {deliveryType === "flat" && (
                  <>
                    <div>
                      <label className="block font-label-md text-sm text-on-surface mb-1">Flat Delivery Fee (₹)</label>
                      <input
                        type="number" min="0" value={deliveryFlatFee}
                        onChange={(e) => setDeliveryFlatFee(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                        placeholder="50"
                      />
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-outline/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-label-md text-sm text-on-surface">Free delivery threshold</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">Waive the fee on orders above a certain amount.</p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <div
                            onClick={() => setDeliveryFreeThresholdEnabled(!deliveryFreeThresholdEnabled)}
                            className={`w-11 h-6 rounded-full relative transition-colors ${deliveryFreeThresholdEnabled ? "bg-green-500" : "bg-gray-300"}`}
                          >
                            <div
                              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                              style={{ transform: deliveryFreeThresholdEnabled ? "translateX(20px)" : "translateX(0)" }}
                            />
                          </div>
                        </label>
                      </div>
                      {deliveryFreeThresholdEnabled && (
                        <div className="mt-3">
                          <label className="block font-label-md text-xs text-on-surface mb-1">Free delivery above (₹)</label>
                          <input
                            type="number" min="0" value={deliveryFreeThreshold}
                            onChange={(e) => setDeliveryFreeThreshold(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                            placeholder="e.g. 500"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Customer Details Toggles */}
              <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
                <h3 className="font-label-md font-semibold text-on-surface">Checkout Details to Collect</h3>
                <p className="text-xs text-on-surface-variant -mt-2">Customers will fill these before paying. At least one contact method (Phone or Email) is required.</p>
                {(["name", "phone", "email", "address"] as const).map((field) => (
                  <div key={field} className="flex items-center justify-between">
                    <div>
                      <p className="font-label-md text-sm text-on-surface capitalize">{field === "address" ? "Delivery address" : field}</p>
                      <p className="text-xs text-on-surface-variant">{field === "name" ? "Always collected" : field === "phone" ? "Used for OTP tracking & updates" : field === "email" ? "Order confirmation & tracking link" : "Required for shipping"}</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div
                        onClick={() => {
                          if (field === "name") return;
                          if (field === "phone" && customerFields.phone && !customerFields.email) return;
                          if (field === "email" && customerFields.email && !customerFields.phone) return;
                          setCustomerFields((prev) => ({ ...prev, [field]: !prev[field] }));
                        }}
                        className={`w-11 h-6 rounded-full relative transition-colors ${customerFields[field] ? "bg-green-500" : "bg-gray-300"} ${field === "name" ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div
                          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                          style={{ transform: customerFields[field] ? "translateX(20px)" : "translateX(0)" }}
                        />
                      </div>
                    </label>
                  </div>
                ))}
                {!customerFields.phone && !customerFields.email && (
                  <p className="text-xs text-red-500 text-center">Enable Phone or Email — at least one contact method is required.</p>
                )}
                <div className="border-t border-outline-variant/20 pt-3">
                  {(["message"] as const).map((field) => (
                    <div key={field} className="flex items-center justify-between py-1.5">
                      <p className="font-label-md text-sm text-on-surface capitalize">{field === "message" ? "Custom message / order note" : field}</p>
                      <label className="flex items-center cursor-pointer">
                        <div
                          onClick={() => setCustomerFields((prev) => ({ ...prev, [field]: !prev[field] }))}
                          className={`w-11 h-6 rounded-full relative transition-colors ${customerFields[field] ? "bg-green-500" : "bg-gray-300"}`}
                        >
                          <div
                            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                            style={{ transform: customerFields[field] ? "translateX(20px)" : "translateX(0)" }}
                          />
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleSavePayments} disabled={saving}
            className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
          >
            {saving ? "Saving..." : isFirstTime ? "Save & Continue" : "Save Changes"}
          </button>
        </div>
      ) : null}

      {/* ── Account Tab (plan + password) ─────────────────────────────── */}
      {tab === "account" && !isFirstTime && (
        <div className="space-y-6">
          {/* Plan status */}
          {plan && (
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  planBanner?.type === "expired" ? "bg-red-100" : planBanner?.type === "trial" ? "bg-blue-100" : "bg-green-100"
                }`}>
                  <span className={`material-symbols-outlined ${
                    planBanner?.type === "expired" ? "text-red-600" : planBanner?.type === "trial" ? "text-blue-600" : "text-green-600"
                  }`}>
                    {planBanner?.type === "expired" ? "error" : planBanner?.type === "trial" ? "timer" : "check_circle"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Your Plan</p>
                  <p className="text-lg font-bold text-on-surface">
                    {plan === "trial" ? "Free Trial" : plan === "paid" ? getPlanLabel(userDoc?.subscriptionPlan) : "Expired"}
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-4 mb-4 space-y-2">
                {plan === "trial" && userDoc?.trialEndsAt && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Expires on</span>
                      <span className="font-semibold text-on-surface">
                        {formatDate(userDoc.trialEndsAt)}
                      </span>
                    </div>
                    {planBanner?.type === "expired" && (
                      <p className="text-sm text-red-600">Your trial has ended. Subscribe to keep your store online.</p>
                    )}
                    {planBanner?.type === "trial" && (
                      <p className="text-sm text-blue-600">Renew now to keep your store active after the trial.</p>
                    )}
                  </>
                )}
                {plan === "paid" && userDoc?.subscriptionEndsAt && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Expires on</span>
                      <span className="font-semibold text-on-surface">
                        {formatDate(userDoc.subscriptionEndsAt)}
                      </span>
                    </div>
                    {planBanner?.type === "paid" && (
                      <p className="text-sm text-green-600">Your store is live. Renew before expiry to avoid deactivation.</p>
                    )}
                    {planBanner?.type === "expired" && (
                      <p className="text-sm text-red-600">Your plan has expired. Renew now to reactivate your store.</p>
                    )}
                  </>
                )}
                {plan === "expired" && (
                  <p className="text-sm text-red-600">Your plan has expired. Subscribe now to reactivate your store and start selling again.</p>
                )}
              </div>

              {(planBanner?.type === "expired" || plan === "trial" || plan === "paid") && (
                <Link
                  href="/choose-plan"
                  className="block w-full text-center py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] hover:opacity-90"
                  style={{ backgroundColor: "#ff6b35", boxShadow: "0 4px 12px rgba(255,107,53,0.25)" }}
                >
                  {plan === "trial" ? "Subscribe Now" : "Renew Now"}
                </Link>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
