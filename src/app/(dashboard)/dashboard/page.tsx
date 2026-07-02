"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import OnboardingModal from "@/components/OnboardingModal";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [storeLink, setStoreLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [planBanner, setPlanBanner] = useState<{ type: "trial" | "expired" | "paid"; message: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sellri_user");
    if (!stored) { router.push("/signin"); return; }
    const u = JSON.parse(stored);
    setUser(u);
    Promise.all([
      getDoc(doc(db, "users", u.uid)),
      getDocs(query(collection(db, "users", u.uid, "products"))),
      getDocs(query(collection(db, "users", u.uid, "orders"))),
    ]).then(([userSnap, prodSnap, orderSnap]) => {
      if (!userSnap.exists()) { setChecking(false); return; }
      const data = userSnap.data();
      if (data?.onboarded !== true) {
        setOnboarding(true);
        setChecking(false);
        return;
      }
      const slug = data?.slug || (data?.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "store" : u.uid);
      setStoreLink(`${window.location.origin}/store/${slug}`);
      setProductCount(prodSnap.size);
      setOrderCount(orderSnap.size);
      let total = 0;
      orderSnap.forEach((d) => { total += d.data().total || 0; });
      setRevenue(total);
      setChecking(false);

      // Plan info — only show trial-related banners on dashboard
      const plan = data?.plan;
      const now = Date.now();
      if (plan === "trial" && data?.trialEndsAt) {
        const end = data.trialEndsAt.toMillis ? data.trialEndsAt.toMillis() : data.trialEndsAt.seconds * 1000;
        const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) {
          setPlanBanner({ type: "expired", message: "Your free trial has ended. Subscribe to keep your store active." });
        } else {
          setPlanBanner({ type: "trial", message: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial` });
        }
      } else if ((plan === "paid" || plan === "expired") && data?.subscriptionEndsAt) {
        const end = data.subscriptionEndsAt.toMillis ? data.subscriptionEndsAt.toMillis() : data.subscriptionEndsAt.seconds * 1000;
        if (now > end) {
          setPlanBanner({ type: "expired", message: "Your subscription has expired. Renew to keep your store active." });
        }
      } else if (plan === "expired") {
        setPlanBanner({ type: "expired", message: "Your plan has expired. Subscribe to reactivate your store." });
      }
    });
  }, [router]);

  async function copyStoreLink() {
    try {
      await navigator.clipboard.writeText(storeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }

  if (!user || checking) return null;

  if (onboarding && user) {
    return <OnboardingModal uid={user.uid} name={user.name} email={user.email} />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {planBanner && (
        <div
          className={`rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 ${
            planBanner.type === "expired"
              ? "bg-red-50 border border-red-200"
              : planBanner.type === "trial"
              ? "bg-blue-50 border border-blue-200"
              : "bg-green-50 border border-green-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`material-symbols-outlined ${
                planBanner.type === "expired" ? "text-red-500" : planBanner.type === "trial" ? "text-blue-500" : "text-green-500"
              }`}
            >
              {planBanner.type === "expired" ? "error" : planBanner.type === "trial" ? "timer" : "check_circle"}
            </span>
            <p
              className={`text-sm font-medium ${
                planBanner.type === "expired" ? "text-red-700" : planBanner.type === "trial" ? "text-blue-700" : "text-green-700"
              }`}
            >
              {planBanner.message}
            </p>
          </div>
          {planBanner.type === "expired" && (
            <Link
              href="/choose-plan"
              className="shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: "#f68f1d" }}
            >
              Subscribe Now
            </Link>
          )}
        </div>
      )}

      <h1 className="font-display-lg text-3xl md:text-4xl text-on-surface mb-2">
        Welcome{user.name ? `, ${user.name}` : ""}!
      </h1>
      <p className="text-on-surface-variant mb-8">{user.email}</p>

      {/* Store link share */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-outline-variant/30 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-sm text-on-surface-variant mb-1">Your store link</p>
            <a href={storeLink} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-black truncate block hover:underline">Click here to go to your store</a>
          </div>
          <button
            onClick={copyStoreLink}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-black/5 active:scale-[0.95] transition-all cursor-pointer shrink-0"
            style={{ color: copied ? "#22c55e" : "#6b7280" }}
            title="Copy link"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{copied ? "check" : "content_copy"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Orders</p>
              <p className="text-2xl font-bold">{orderCount}</p>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant">{orderCount === 0 ? "No orders yet" : `${orderCount} total`}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Products</p>
              <p className="text-2xl font-bold">{productCount}</p>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant">{productCount === 0 ? "Add your first product" : "Listed"}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Revenue</p>
              <p className="text-2xl font-bold">₹{revenue}</p>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant">{revenue === 0 ? "Start selling to earn" : "Total earned"}</p>
        </div>
      </div>
    </div>
  );
}
