"use client";

import { useState } from "react";
import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "store";
}

async function slugExists(slug: string, excludeUid: string): Promise<boolean> {
  const q = query(collection(db, "users"), where("slug", "==", slug));
  const snap = await getDocs(q);
  return snap.docs.some((d) => d.id !== excludeUid);
}

export default function OnboardingModal({ uid, name, email }: { uid: string; name: string; email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"store" | "preferences" | "orders">("store");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [storeName, setStoreName] = useState(name);
  const [storeSlug, setStoreSlug] = useState(generateSlug(name || "store"));
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [bio, setBio] = useState("");
  const [makeToOrder, setMakeToOrder] = useState(false);
  const [orderMethod, setOrderMethod] = useState<"whatsapp" | "instagram" | "razorpay">("whatsapp");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);

  if (initialLoad && storeName && !slugManuallyEdited) {
    const slug = generateSlug(storeName);
    if (slug !== "store") setStoreSlug(slug);
    setInitialLoad(false);
  }

  function onStoreNameChange(val: string) {
    setStoreName(val);
    if (!slugManuallyEdited) setStoreSlug(generateSlug(val || "store"));
  }

  async function handleSaveStore() {
    setError(""); setSaving(true);
    try {
      let slug = storeSlug.trim().toLowerCase();
      if (!slug) slug = generateSlug(storeName || "store");
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        setError("Store URL can only contain lowercase letters, numbers, and hyphens.");
        setSaving(false);
        return;
      }
      if (await slugExists(slug, uid)) {
        setError("This store URL is already taken. Please choose another.");
        setSaving(false);
        return;
      }
      await updateDoc(doc(db, "users", uid), {
        name: storeName,
        slug,
        bio,
        onboarded: true,
        updatedAt: serverTimestamp(),
      });
      localStorage.setItem("sellri_user", JSON.stringify({ uid, name: storeName, email }));
      setStep("preferences");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences() {
    setError(""); setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), { makeToOrder, updatedAt: serverTimestamp() });
      setStep("orders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePayments() {
    setError(""); setSaving(true);
    try {
      if (orderMethod === "whatsapp" && !whatsapp.trim()) {
        setError("Please enter your WhatsApp number.");
        setSaving(false);
        return;
      }
      if (orderMethod === "instagram" && !instagram.trim()) {
        setError("Please enter your Instagram username.");
        setSaving(false);
        return;
      }
      await updateDoc(doc(db, "users", uid), {
        orderMethod,
        whatsapp: orderMethod === "whatsapp" ? whatsapp : "",
        instagram: orderMethod === "instagram" ? instagram : "",
        razorpayKeyId: orderMethod === "razorpay" ? razorpayKeyId : "",
        razorpayKeySecret: orderMethod === "razorpay" ? razorpayKeySecret : "",
        delivery: orderMethod === "razorpay" ? { type: "none", flatFee: 0, freeThreshold: 0, paymentMode: "online", codPartialAmount: 0, codPartialType: "flat" } : { type: "none", flatFee: 0, freeThreshold: 0, paymentMode: "online", codPartialAmount: 0, codPartialType: "flat" },
        customerFields: orderMethod === "razorpay" ? { name: true, phone: false, email: false, address: false, message: false } : { name: true, phone: false, email: false, address: false, message: false },
        onboarded: true,
        updatedAt: serverTimestamp(),
      });
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const steps = ["store", "preferences", "orders"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-2 text-center">
          <h1 className="font-display-lg text-2xl md:text-3xl text-on-surface mb-1">Welcome to Sellri!</h1>
          <p className="text-on-surface-variant text-sm">Let&apos;s set up your store in a few steps.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 px-6 py-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? "bg-[#ff6b35] text-white" :
                steps.indexOf(step) > i ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {steps.indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${steps.indexOf(step) > i ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-label-sm text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Step 1: Store Details */}
        {step === "store" && (
          <div className="px-6 pb-8 space-y-5">
            <h2 className="font-headline-md text-lg text-on-surface">Store Details</h2>
            <div>
              <label className="block font-label-md text-sm text-on-surface mb-1">Store Name</label>
              <input type="text" value={storeName}
                onChange={(e) => onStoreNameChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#ff6b35] focus:ring-4 focus:ring-[#ff6b35]/10 transition-all bg-white"
                placeholder="Rahul's Store"
              />
            </div>
            <div>
              <label className="block font-label-md text-sm text-on-surface mb-1">Store URL</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-sm text-gray-500 shrink-0">sellri.in/</span>
                <input type="text" value={storeSlug}
                  onChange={(e) => { setSlugManuallyEdited(true); setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                  className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-[#ff6b35] focus:ring-4 focus:ring-[#ff6b35]/10 transition-all bg-white"
                  placeholder="rahuls-store"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Auto-generated from your store name. You can customise it.</p>
            </div>
            <div>
              <label className="block font-label-md text-sm text-on-surface mb-1">Store Description</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                rows={3} maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#ff6b35] focus:ring-4 focus:ring-[#ff6b35]/10 transition-all bg-white resize-none"
                placeholder="Tell your customers what you sell..."
              />
              <p className="text-xs text-gray-500 mt-1 text-right">{bio.length}/500</p>
            </div>
            <button onClick={handleSaveStore} disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === "preferences" && (
          <div className="px-6 pb-8 space-y-5">
            <h2 className="font-headline-md text-lg text-on-surface">Store Preferences</h2>
            <p className="text-sm text-gray-500 -mt-3">Customise how your store works.</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-sm text-on-surface">Make to order</p>
                  <p className="text-xs text-gray-500">Disable stock tracking — treat all products as in stock (ideal for made-to-order businesses).</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div onClick={() => setMakeToOrder(!makeToOrder)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${makeToOrder ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: makeToOrder ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </div>
                </label>
              </div>
            </div>
            <button onClick={handleSavePreferences} disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        )}

        {/* Step 3: Payment Settings */}
        {step === "orders" && (
          <div className="px-6 pb-8 space-y-5">
            <h2 className="font-headline-md text-lg text-on-surface">Payment Settings</h2>
            <p className="text-sm text-gray-500 -mt-3">Configure how customers pay on your store.</p>

            <div className="space-y-3">
              {(["whatsapp", "instagram", "razorpay"] as const).map((method) => (
                <label key={method} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  orderMethod === method ? "border-[#ff6b35] bg-[#ff6b35]/5" : "border-gray-200 hover:border-[#ff6b35]"
                }`}>
                  <input type="radio" name="o" value={method}
                    checked={orderMethod === method}
                    onChange={() => setOrderMethod(method)}
                    className="mt-1 accent-[#ff6b35]"
                  />
                  <div>
                    <p className="font-label-md font-bold text-on-surface">
                      {method === "whatsapp" ? "WhatsApp Orders" : method === "instagram" ? "Instagram Orders" : "In-App Payments (Razorpay)"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {method === "whatsapp" ? "Customers send orders directly to your WhatsApp." : method === "instagram" ? "Customers DM their orders to your Instagram." : "Customers pay directly on your store via UPI, cards & more."}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {orderMethod === "whatsapp" && (
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block font-label-md text-sm text-on-surface mb-1">WhatsApp Number <span className="text-red-500">*</span></label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 text-sm text-gray-500">+91</span>
                  <input type="tel" value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full px-4 py-3 rounded-r-xl border border-gray-300 focus:border-[#ff6b35] focus:ring-4 focus:ring-[#ff6b35]/10 transition-all bg-white"
                    placeholder="9876543210"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Required. Customers will send orders here.</p>
              </div>
            )}

            {orderMethod === "instagram" && (
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block font-label-md text-sm text-on-surface mb-1">Instagram Username <span className="text-red-500">*</span></label>
                <input type="text" value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#ff6b35] focus:ring-4 focus:ring-[#ff6b35]/10 transition-all bg-white"
                  placeholder="yourstore"
                />
                <p className="text-xs text-gray-500 mt-1">Required. Customers will DM you at instagram.com/{instagram || "yourstore"}</p>
              </div>
            )}

            {orderMethod === "razorpay" && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
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
                  <input type="text" value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value.trim())}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#ff6b35] focus:ring-4 focus:ring-[#ff6b35]/10 transition-all bg-white"
                    placeholder="rzp_live_xxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-sm text-on-surface mb-1">Razorpay Key Secret</label>
                  <input type="password" value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value.trim())}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#ff6b35] focus:ring-4 focus:ring-[#ff6b35]/10 transition-all bg-white"
                    placeholder="xxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>
            )}

            <button onClick={handleSavePayments} disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
            >
              {saving ? "Saving..." : "Complete Setup"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
