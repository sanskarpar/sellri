"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, query, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [storeLink, setStoreLink] = useState("");
  const [copied, setCopied] = useState(false);

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
        router.push("/settings");
        return;
      }
      const slug = data?.slug || u.uid;
      setStoreLink(`${window.location.origin}/store/${slug}`);
      setProductCount(prodSnap.size);
      setOrderCount(orderSnap.size);
      let total = 0;
      orderSnap.forEach((d) => { total += d.data().total || 0; });
      setRevenue(total);
      setChecking(false);
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

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display-lg text-3xl md:text-4xl text-on-surface mb-2">
        Welcome{user.name ? `, ${user.name}` : ""}!
      </h1>
      <p className="text-on-surface-variant mb-8">{user.email}</p>

      {/* Store link share */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-outline-variant/30 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-sm text-on-surface-variant mb-1">Your store link</p>
            <p className="text-sm text-on-surface truncate">{storeLink}</p>
          </div>
          <button
            onClick={copyStoreLink}
            className="flex items-center gap-2 py-2.5 px-5 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            style={{ backgroundColor: "#ff6b35", boxShadow: "0 4px 12px rgba(255,107,53,0.2)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? "check" : "content_copy"}</span>
            {copied ? "Copied!" : "Copy Link"}
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
