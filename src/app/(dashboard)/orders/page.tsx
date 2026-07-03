"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLockBody } from "@/hooks/useLockBody";

const STATUSES = ["Received", "Paid", "COD", "Out for Delivery", "Delivered"] as const;
type OrderStatus = (typeof STATUSES)[number];

type Order = {
  id: string;
  reference?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  customerMessage?: string;
  items: string | { productName: string; price: number; quantity: number }[];
  total: number;
  status: OrderStatus;
  source?: "manual" | "razorpay";
  paymentId?: string;
  paymentMode?: string;
  paidAmount?: number;
  codAmount?: number;
  createdAt?: any;
};

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"orders" | "customers">("orders");

  useLockBody(showForm);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formProducts, setFormProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [formSelected, setFormSelected] = useState<Record<string, number>>({});
  const [formCustomDesc, setFormCustomDesc] = useState("");
  const [formCustomPrice, setFormCustomPrice] = useState("");
  const [formLoadingProducts, setFormLoadingProducts] = useState(false);
  const [formProductSearch, setFormProductSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("sellri_user");
    if (!stored) { router.push("/signin"); return; }
    const u = JSON.parse(stored);
    setUser(u);
    loadOrders(u.uid);
  }, [router]);

  async function loadOrders(uid: string) {
    setLoading(true);
    const q = query(collection(db, "users", uid, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list: Order[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
    setOrders(list);
    setLoading(false);
  }

  function resetForm() {
    setFormName(""); setFormPhone(""); setFormSelected({}); setFormCustomDesc(""); setFormCustomPrice(""); setFormProducts([]); setFormProductSearch("");
  }

  async function openAddForm() {
    resetForm();
    setShowForm(true);
    if (!user) return;
    setFormLoadingProducts(true);
    try {
      const q = query(collection(db, "users", user.uid, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setFormProducts(snap.docs.map((d) => ({ id: d.id, name: d.data().name || "", price: d.data().price || 0 })));
    } finally {
      setFormLoadingProducts(false);
    }
  }

  const formTotal = Object.entries(formSelected).reduce((sum, [id, qty]) => sum + (formProducts.find((p) => p.id === id)?.price ?? 0) * qty, 0) + (parseFloat(formCustomPrice) || 0);

  async function handleAddOrder() {
    if (!user || !formName || !formPhone) return;
    setSaving(true);
    try {
      const itemsParts: string[] = [];
      for (const [id, qty] of Object.entries(formSelected)) {
        const p = formProducts.find((p) => p.id === id);
        if (p && qty > 0) itemsParts.push(`${p.name} x${qty} (₹${p.price * qty})`);
      }
      if (formCustomDesc.trim()) itemsParts.push(`${formCustomDesc.trim()}${formCustomPrice ? ` (₹${formCustomPrice})` : ""}`);
      await addDoc(collection(db, "users", user.uid, "orders"), {
        customerName: formName.trim(),
        customerPhone: formPhone.trim(),
        items: itemsParts.join(", "),
        total: formTotal,
        status: "Received",
        source: "manual",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await loadOrders(user.uid);
      setShowForm(false);
      resetForm();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add order");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(order: Order, status: OrderStatus) {
    if (!user) return;
    const prevStatus = order.status;
    setOrders((list) => list.map((o) => o.id === order.id ? { ...o, status } : o));
    try {
      await updateDoc(doc(db, "users", user.uid, "orders", order.id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setOrders((list) => list.map((o) => o.id === order.id ? { ...o, status: prevStatus } : o));
    }
  }

  // Customer list derived from orders
  const customers = orders.reduce<{ name: string; phone: string; totalOrders: number; totalSpent: number; lastOrder: string }[]>((acc, o) => {
    const existing = acc.find((c) => c.phone === o.customerPhone);
    if (existing) {
      existing.totalOrders++;
      existing.totalSpent += o.total;
    } else {
      acc.push({ name: o.customerName, phone: o.customerPhone, totalOrders: 1, totalSpent: o.total, lastOrder: o.status });
    }
    return acc;
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-on-surface-variant">Loading...</p></div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 mb-6">
        {(["orders", "customers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 font-label-md capitalize transition-all cursor-pointer relative ${tab === t ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"}`}
          >
            {t === "orders" ? `Orders (${orders.length})` : `Customers (${customers.length})`}
            {tab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#ff6b35" }} />}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === "orders" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-on-surface-variant">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 py-3 px-6 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Add Order
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">receipt_long</span>
              <h2 className="font-headline-md text-xl text-on-surface mb-2">No orders yet</h2>
              <p className="text-on-surface-variant mb-6">Add your first order to start tracking.</p>
              <button
                onClick={openAddForm}
                className="py-3 px-8 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
              >
                Add Order
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isRazorpay = order.source === "razorpay";
                const itemList = typeof order.items === "string" ? order.items : order.items.map((i: any) => `${i.productName} x${i.quantity} (₹${i.price * i.quantity})`).join(", ");
                return (
                <div key={order.id} className="bg-white rounded-2xl p-4 md:p-6 border border-outline-variant/30 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {order.reference && (
                          <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{order.reference}</span>
                        )}
                        {order.paymentMode === "cod" && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">COD</span>
                        )}
                        {order.paymentMode === "partial_cod" && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">Partial COD</span>
                        )}
                        {isRazorpay && (!order.paymentMode || order.paymentMode === "online") && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">Online</span>
                        )}
                      </div>
                      <h3 className="font-label-md font-bold text-on-surface">{order.customerName}</h3>
                      <p className="text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined inline-block align-middle" style={{ fontSize: 14 }}>call</span>{" "}
                        {order.customerPhone}
                      </p>
                      {order.customerEmail && (
                        <p className="text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined inline-block align-middle" style={{ fontSize: 14 }}>mail</span>{" "}
                          {order.customerEmail}
                        </p>
                      )}
                      {order.customerAddress && (
                        <p className="text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined inline-block align-middle" style={{ fontSize: 14 }}>location_on</span>{" "}
                          {order.customerAddress}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-primary">₹{order.total}</span>
                  </div>

                  {itemList && (
                    <p className="text-sm text-on-surface-variant mb-3">
                      <span className="material-symbols-outlined inline-block align-middle" style={{ fontSize: 14 }}>inventory_2</span>{" "}
                      {itemList}
                    </p>
                  )}

                  {order.customerMessage && (
                    <p className="text-sm bg-amber-50 text-amber-800 p-3 rounded-xl mb-3">
                      <span className="font-semibold">Note:</span> {order.customerMessage}
                    </p>
                  )}

                  {/* Status tracker */}
                  <div className="flex items-center gap-1 md:gap-2 mt-4 pt-4 border-t border-outline-variant/20">
                    {(() => {
                      const isCod = order.paymentMode === "cod" || order.paymentMode === "partial_cod";
                      const statuses = isCod ? (["COD", "Out for Delivery", "Delivered"] as const) : (order.source === "razorpay" ? STATUSES.filter((s) => s !== "Received") : STATUSES);
                      return statuses.map((s, i, arr) => {
                      const idx = arr.indexOf(order.status as any);
                      const isCurrent = order.status === s;
                      const isPast = idx > i;
                      const isClickable = order.status !== s;
                      return (
                        <div key={s} className="flex flex-col md:flex-row items-center flex-1 min-w-0">
                          <button
                            onClick={() => handleStatus(order, s)}
                            disabled={!isClickable}
                            className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isClickable ? "cursor-pointer active:scale-90" : "cursor-default"} ${isCurrent ? "text-white shadow-md" : isPast ? "bg-green-100 text-green-600" : "bg-surface-container-low text-on-surface-variant/40"}`}
                            style={isCurrent ? { backgroundColor: "#ff6b35" } : {}}
                            title={s}
                          >
                            {isPast ? "✓" : i + 1}
                          </button>
                          <span className={`text-[9px] md:text-xs mt-0.5 md:mt-0 md:ml-2 min-w-0 truncate text-center leading-tight ${isCurrent ? "text-primary font-semibold" : "text-on-surface-variant"}`}>{s}</span>
                          {i < arr.length - 1 && (
                            <div className={`hidden md:block flex-1 h-0.5 mx-2 ${isPast ? "bg-green-400" : "bg-outline-variant/30"}`} />
                          )}
                        </div>
                      );
                    });
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/20">
                    {order.customerPhone && (
                      <a
                        href={`https://wa.me/91${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${order.customerName}, regarding your order ${order.reference || ""} (₹${order.total}) — Status: ${order.status}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span>
                        WhatsApp
                      </a>
                    )}
                    {order.status === "Received" && (
                      <button
                        onClick={() => {
                          if (!user) return;
                          setOrders((prev) => prev.filter((o) => o.id !== order.id));
                          deleteDoc(doc(db, "users", user.uid, "orders", order.id)).catch(() => loadOrders(user.uid));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </>
      )}

      {/* Customers tab */}
      {tab === "customers" && (
        <>
          <p className="text-on-surface-variant mb-6">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
          {customers.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">people</span>
              <h2 className="font-headline-md text-xl text-on-surface mb-2">No customers yet</h2>
              <p className="text-on-surface-variant">Customers will appear once you add orders.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/20">
                      <th className="text-left px-4 py-3 font-label-md text-on-surface-variant">Name</th>
                      <th className="text-left px-4 py-3 font-label-md text-on-surface-variant">Phone</th>
                      <th className="text-center px-4 py-3 font-label-md text-on-surface-variant">Orders</th>
                      <th className="text-right px-4 py-3 font-label-md text-on-surface-variant">Total Spent</th>
                      <th className="text-right px-4 py-3 font-label-md text-on-surface-variant">Last Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.phone} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50">
                        <td className="px-4 py-3 font-label-md text-on-surface">{c.name}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{c.phone}</td>
                        <td className="px-4 py-3 text-center">{c.totalOrders}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">₹{c.totalSpent}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            c.lastOrder === "Delivered" ? "bg-green-100 text-green-600" :
                            c.lastOrder === "Received" ? "bg-blue-100 text-blue-600" :
                            "bg-orange-100 text-orange-600"
                          }`}>{c.lastOrder}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {customers.map((c) => (
                  <div key={c.phone} className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-label-md font-bold text-on-surface">{c.name}</p>
                        <p className="text-sm text-on-surface-variant">{c.phone}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        c.lastOrder === "Delivered" ? "bg-green-100 text-green-600" :
                        c.lastOrder === "Received" ? "bg-blue-100 text-blue-600" :
                        "bg-orange-100 text-orange-600"
                      }`}>{c.lastOrder}</span>
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t border-outline-variant/10">
                      <div className="text-center">
                        <p className="text-lg font-bold text-on-surface">{c.totalOrders}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">₹{c.totalSpent}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Spent</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/40" style={{ backdropFilter: "blur(4px)" }} onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <h2 className="font-headline-md text-lg text-on-surface">New Order</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Customer Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md" placeholder="Rahul Sharma" />
              </div>
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Phone *</label>
                <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md" placeholder="9876543210" />
              </div>
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-2">Products</label>
                {formLoadingProducts ? (
                  <p className="text-sm text-on-surface-variant">Loading products...</p>
                ) : formProducts.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No products found. Add products from the Products page.</p>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formProductSearch}
                      onChange={(e) => setFormProductSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white text-sm mb-2"
                      placeholder="Search products..."
                    />
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-outline-variant/20 rounded-xl p-2">
                      {formProductSearch.trim() ? (
                        (() => {
                          const matches = formProducts.filter((p) =>
                            p.name.toLowerCase().includes(formProductSearch.toLowerCase())
                          );
                          return matches.length === 0 ? (
                            <p className="text-sm text-on-surface-variant p-2">No matching products</p>
                          ) : (
                            matches.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-on-surface truncate">{p.name}</p>
                                  <p className="text-xs text-on-surface-variant">₹{p.price}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setFormSelected((prev) => {
                                      const next = { ...prev };
                                      if ((next[p.id] || 0) <= 1) delete next[p.id];
                                      else next[p.id] = (next[p.id] || 0) - 1;
                                      return next;
                                    })}
                                    disabled={!formSelected[p.id]}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border border-outline-variant/30 hover:bg-black/5 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
                                  >−</button>
                                  <span className="w-6 text-center text-sm font-semibold">{formSelected[p.id] || 0}</span>
                                  <button
                                    onClick={() => setFormSelected((prev) => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white transition-colors cursor-pointer"
                                    style={{ backgroundColor: "#ff6b35" }}
                                  >+</button>
                                </div>
                              </div>
                            ))
                          );
                        })()
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-outline-variant/20 pt-4">
                <label className="block font-label-md text-sm text-on-surface mb-1">Custom Item (optional)</label>
                <input type="text" value={formCustomDesc} onChange={(e) => setFormCustomDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md mb-2" placeholder="Custom item description" />
                <input type="number" value={formCustomPrice} onChange={(e) => setFormCustomPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md" placeholder="Custom item price" min="0" step="0.01" />
              </div>
              {Object.entries(formSelected).filter(([, qty]) => qty > 0).length > 0 && (
                <div className="border-t border-outline-variant/20 pt-3 space-y-1.5">
                  <span className="font-label-md text-xs text-on-surface-variant">Selected Items</span>
                  {Object.entries(formSelected).filter(([, qty]) => qty > 0).map(([id, qty]) => {
                    const p = formProducts.find((prod) => prod.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} className="flex items-center justify-between text-sm">
                        <span className="text-on-surface truncate">{p.name} <span className="text-on-surface-variant">x{qty}</span></span>
                        <span className="font-semibold text-on-surface">₹{p.price * qty}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <span className="font-label-md text-sm text-on-surface">Total</span>
                <span className="text-lg font-bold text-primary">₹{formTotal}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-label-md text-on-surface-variant border border-outline hover:text-on-surface transition-all cursor-pointer">Cancel</button>
              <button onClick={handleAddOrder} disabled={saving || !formName || !formPhone} className="flex-[2] py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer" style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}>
                {saving ? "Adding..." : "Add Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
