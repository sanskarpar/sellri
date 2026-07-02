"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, orderBy, getDocs, limit, getDoc, doc, addDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProductsSection, { ProductDetailModal } from "@/components/sections/ProductsSection";
import FooterSection from "@/components/sections/FooterSection";


import useGoogleFont from "@/hooks/useGoogleFont";
import { useLockBody } from "@/hooks/useLockBody";

type Section = {
  id: string;
  type: "hero" | "products" | "carousel" | "text" | "form" | "footer";
  props: Record<string, any>;
};

type DeliveryConfig = {
  type: "none" | "flat";
  flatFee: number;
  freeThreshold: number;
};

type CustomerFields = {
  name: boolean;
  phone: boolean;
  email: boolean;
  address: boolean;
  message: boolean;
};

type Seller = {
  id: string;
  name: string;
  bio: string;
  photoURL: string;
  whatsapp: string;
  instagram: string;
  orderMethod: "whatsapp" | "instagram" | "razorpay";
  razorpayKeyId: string;
  allowCustomOrders: boolean;
  delivery?: DeliveryConfig;
  customerFields?: CustomerFields;
  storefront?: {
    navbar: { logoPosition: "left" | "center" | "right"; bgColor?: string; bgImage?: string; logoURL?: string; logoHeight?: number; logoText?: string; logoFont?: string; logoTextColor?: string };
    sections: Section[];
    products?: { title?: string; subtitle?: string; showCategoryFilter?: boolean; bgColor?: string; bgGradient?: string; bgImage?: string };
    form?: { title?: string; description?: string; contactMethod?: "whatsapp" | "email"; whatsapp?: string; showWhatsappContact?: boolean; recipientEmail?: string; buttonLabel?: string; phone?: string; email?: string; address?: string; bgColor?: string; bgGradient?: string; bgImage?: string };
    footer?: { storeName?: string; logo?: string; instagram?: string; whatsapp?: string; facebook?: string; copyright?: string; phone?: string; email?: string; address?: string; bgColor?: string; bgGradient?: string; bgImage?: string; termsUrl?: string; privacyUrl?: string; refundsUrl?: string; shippingUrl?: string };
    theme?: { primaryColor?: string; font?: string; bgType?: "color" | "gradient" | "image"; bgColor?: string; bgGradient?: string; bgImage?: string };
  };
};

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  photoURL: string;
  photoURLs?: string[];
  inStock: boolean;
  category: string;
};

type CartItem = { product: Product; quantity: number };

function loadStoreFont(fontName: string): Promise<void> {
  if (!fontName) return Promise.resolve();
  return new Promise((resolve) => {
    const id = `gf-${fontName.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) { resolve(); return; }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@400;700&display=swap`;
    link.onload = () => { document.fonts.ready.then(() => resolve()).catch(() => resolve()); };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

function preloadImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return Promise.resolve();
  return Promise.allSettled(
    urls.map((url) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    }))
  ).then(() => {});
}

export default function StorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [activeCat, setActiveCat] = useState("");
  const [showCustomOrder, setShowCustomOrder] = useState(false);
  const [customOrderText, setCustomOrderText] = useState("");
  const [customOrderName, setCustomOrderName] = useState("");
  const [customOrderPhone, setCustomOrderPhone] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartInitialized, setCartInitialized] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<{
    reference: string;
    total: number;
    items: string[];
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    paymentId: string;
  } | null>(null);

  useGoogleFont(seller?.storefront?.theme?.font || "");

  useLockBody(showCart || showCustomOrder || !!selectedProduct || showCustomerForm || !!orderConfirmed || processingPayment);

  useEffect(() => {
    if (!slug) return;
    loadStore();
  }, [slug]);

  useEffect(() => {
    if (!seller || seller.orderMethod !== "razorpay") return;
    if ((window as any).Razorpay) { setRazorpayLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, [seller]);

  // Cart persistence — load from localStorage when seller changes
  useEffect(() => {
    if (!seller?.id) return;
    const key = `cart_${seller.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch { setCart([]); }
    } else {
      setCart([]);
    }
    setCartInitialized(true);
  }, [seller?.id]);

  // Cart persistence — save to localStorage on every change
  useEffect(() => {
    if (!seller?.id || !cartInitialized) return;
    localStorage.setItem(`cart_${seller.id}`, JSON.stringify(cart));
  }, [cart, seller?.id, cartInitialized]);

  async function loadStore() {
    setLoading(true);

    const userQuery = query(
      collection(db, "users"),
      where("slug", "==", slug),
      limit(1)
    );
    const userSnap = await getDocs(userQuery);
    if (userSnap.empty) { setLoading(false); return; }

    const userDoc = userSnap.docs[0];
    const data = userDoc.data() as any;
    const sellerId = userDoc.id;

    // Plan enforcement
    const now = Date.now();
    const plan = data.plan;
    if (plan === "expired") {
      window.location.replace("https://sellri.in");
      return;
    }
    if (plan === "trial" && data.trialEndsAt) {
      const trialEnd = data.trialEndsAt.toMillis ? data.trialEndsAt.toMillis() : data.trialEndsAt.seconds * 1000;
      if (now > trialEnd) {
        await setDoc(doc(db, "users", sellerId), { plan: "expired", updatedAt: serverTimestamp() }, { merge: true });
        window.location.replace("https://sellri.in");
        return;
      }
    }
    if (plan === "paid" && data.subscriptionEndsAt) {
      const subEnd = data.subscriptionEndsAt.toMillis ? data.subscriptionEndsAt.toMillis() : data.subscriptionEndsAt.seconds * 1000;
      if (now > subEnd) {
        await setDoc(doc(db, "users", sellerId), { plan: "expired", updatedAt: serverTimestamp() }, { merge: true });
        window.location.replace("https://sellri.in");
        return;
      }
    }

    const sellerData = {
      id: sellerId,
      name: data.name || "My Store",
      bio: data.bio || "",
      photoURL: data.photoURL || "",
      whatsapp: data.whatsapp || "",
      instagram: data.instagram || "",
      orderMethod: data.orderMethod || "whatsapp",
      razorpayKeyId: data.razorpayKeyId || "",
      allowCustomOrders: data.allowCustomOrders ?? false,
      delivery: data.delivery,
      customerFields: data.customerFields,
      storefront: data.storefront,
    };

    setSeller(sellerData);

    // Start font loading + fetch products in parallel
    const fontLoaded = loadStoreFont(sellerData.storefront?.theme?.font || "");

    const q = query(
      collection(db, "users", sellerId, "products"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const list: Product[] = [];
    snap.forEach((d) => {
      const p = d.data() as any;
      if (p.inStock !== false) list.push({ id: d.id, ...p });
    });
    setProducts(list);

    // Preload first 18 product thumbnails + seller photo while font loads in parallel
    const thumbnails = [
      sellerData.photoURL,
      ...list.slice(0, 18).map((p) => p.photoURL),
    ].filter(Boolean) as string[];
    const imagesLoaded = preloadImages([...new Set(thumbnails)]);

    // Wait for both font + first images before showing page
    await Promise.allSettled([fontLoaded, imagesLoaded]);
    setLoading(false);
  }

  function whatsappUrl(product: Product) {
    if (!seller?.whatsapp) return "#";
    const msg = `Hi, I'm interested in ${product.name} (₹${product.price})`;
    return `https://wa.me/91${seller.whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  function instagramUrl(product: Product) {
    if (!seller?.instagram) return "#";
    const msg = `Hi, I'm interested in ${product.name} (₹${product.price})`;
    return `https://ig.me/m/${seller.instagram}`;
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity } : i));
  }

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const filteredProducts = activeCat ? products.filter((p) => p.category === activeCat) : products;
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const delivery = seller?.delivery && seller.orderMethod === "razorpay" && seller.delivery.type === "flat" && seller.delivery.flatFee > 0
    ? (() => {
        const { flatFee, freeThreshold } = seller.delivery!;
        if (freeThreshold > 0 && cartTotal >= freeThreshold) {
          return { charge: 0, isFree: true, total: cartTotal };
        }
        if (freeThreshold > 0 && cartTotal < freeThreshold) {
          const needed = freeThreshold - cartTotal;
          return { charge: flatFee, isFree: false, total: cartTotal + flatFee, freeNote: `Add ₹${needed} more for free delivery` };
        }
        return { charge: flatFee, isFree: false, total: cartTotal + flatFee };
      })()
    : null;

  function generateReference(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let ref = "SL";
    for (let i = 0; i < 6; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
    return ref;
  }

  async function saveOrder(params: {
    reference: string;
    paymentId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    customerMessage: string;
    items: { product: Product; quantity: number }[];
    total: number;
  }) {
    if (!seller) return;
    const orderData = {
      reference: `#${params.reference}`,
      paymentId: params.paymentId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      customerAddress: params.customerAddress,
      customerMessage: params.customerMessage,
      items: params.items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
      })),
      total: params.total,
      source: "razorpay",
      status: "Paid",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, "users", seller.id, "orders"), orderData);
  }

  async function checkoutRazorpay() {
    if (!seller?.razorpayKeyId || cart.length === 0) return;
    setOrdering(true);

    const total = delivery ? delivery.total : cartTotal;

    try {
      const rzp = new (window as any).Razorpay({
        key: seller.razorpayKeyId,
        amount: Math.round(total * 100),
        currency: "INR",
        name: seller.name,
        description: `Order of ${cart.length} product(s)`,
        prefill: { contact: customerPhone || "", email: customerEmail || "" },
        handler: async (response: any) => {
          setProcessingPayment(true);
          setOrdering(false);
          const reference = generateReference();
          const itemLines = cart.map((i) => `${i.product.name} x${i.quantity} = ₹${i.product.price * i.quantity}`);
          const paymentId = response.razorpay_payment_id || "";
          try {
            await saveOrder({
              reference,
              paymentId,
              customerName: customerName,
              customerPhone: customerPhone,
              customerEmail: customerEmail,
              customerAddress: customerAddress,
              customerMessage: customerMessage,
              items: cart,
              total,
            });
            if (customerEmail) {
              const trackUrl = `${window.location.origin}/track`;
              await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: customerEmail,
                  subject: `Order Confirmed — #${reference}`,
                  html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
                      <div style="text-align:center;margin-bottom:24px">
                        <div style="width:56px;height:56px;background:#d4edda;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto">
                          <span style="font-size:28px;color:#155724;line-height:1">&#10003;</span>
                        </div>
                        <h1 style="font-size:20px;margin:12px 0 4px;color:#1a1a1a">Order Placed!</h1>
                        <p style="color:#666;font-size:14px;margin:0">Thank you for your order.</p>
                      </div>
                      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
                        <tr><td style="padding:8px 0;color:#666">Reference</td><td style="text-align:right;font-weight:700;color:#ff6b35">#${reference}</td></tr>
                        <tr><td style="padding:8px 0;border-top:1px solid #eee;color:#666">Items</td><td style="text-align:right;border-top:1px solid #eee">${itemLines.join("<br/>")}</td></tr>
                        <tr><td style="padding:8px 0;border-top:1px solid #eee;color:#666">Total</td><td style="text-align:right;border-top:1px solid #eee;font-weight:700;font-size:18px">₹${total}</td></tr>
                      </table>
                      <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center;font-size:14px">
                        <p style="margin:0 0 8px;color:#333;font-weight:600">Track your order</p>
                        <a href="${trackUrl}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px">Track Order</a>
                      </div>
                      <p style="color:#999;font-size:12px;text-align:center;margin:0">Sellri — <a href="${trackUrl}" style="color:#ff6b35">${trackUrl}</a></p>
                    </div>`.trim(),
                }),
              });
            }
          } catch {
            // Order saved best-effort
          }
          setOrderConfirmed({
            reference: `#${reference}`,
            total,
            items: itemLines,
            customerName: customerName,
            customerPhone: customerPhone,
            customerEmail: customerEmail,
            customerAddress: customerAddress,
            paymentId,
          });
          setCart([]);
          setShowCart(false);
          setShowCustomerForm(false);
          setProcessingPayment(false);
        },
        modal: { ondismiss: () => { setOrdering(false); setProcessingPayment(false); } },
        theme: { color: "#ff6b35" },
      });
      rzp.open();
    } catch {
      alert("Payment failed. Please try again.");
      setOrdering(false);
    }
  }

  function downloadReceipt(data: NonNullable<typeof orderConfirmed>) {
    import("jspdf").then(({ default: jsPDF }) => {
      const store = seller;
      const storeName = store?.name || "My Store";
      const primary = store?.storefront?.theme?.primaryColor || "#ff6b35";
      const footerConfig = store?.storefront?.footer || {};
      const storePhone = footerConfig.phone || store?.whatsapp || "";
      const storeEmail = footerConfig.email || "";

      const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      const margin = 14;

      function hexToRgb(hex: string) {
        const cleaned = hex.replace("#", "");
        if (cleaned.length < 6) return { r: 255, g: 107, b: 53 };
        return {
          r: parseInt(cleaned.slice(0, 2), 16),
          g: parseInt(cleaned.slice(2, 4), 16),
          b: parseInt(cleaned.slice(4, 6), 16),
        };
      }
      const pc = hexToRgb(primary);
      const lighten = (v: number, amt: number) => Math.round(v + (255 - v) * amt);
      const pcLight = { r: lighten(pc.r, 0.85), g: lighten(pc.g, 0.85), b: lighten(pc.b, 0.85) };

      function dottedLine(x1: number, x2: number, y: number, color: [number, number, number] = [210, 210, 210]) {
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(0.3);
        // @ts-ignore - setLineDashPattern exists on jsPDF instances
        doc.setLineDashPattern([0.6, 0.9], 0);
        doc.line(x1, y, x2, y);
        // @ts-ignore
        doc.setLineDashPattern([], 0);
      }

      // ── Header band ────────────────────────────────────────────
      const headerH = 40;
      doc.setFillColor(pc.r, pc.g, pc.b);
      doc.rect(0, 0, w, headerH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.setTextColor(255, 255, 255);
      doc.text(storeName, w / 2, 18, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("O R D E R   R E C E I P T", w / 2, 26, { align: "center" });

      // Checkmark badge sitting on the header/body seam
      const badgeR = 8;
      const badgeY = headerH;
      doc.setFillColor(255, 255, 255);
      doc.circle(w / 2, badgeY, badgeR, "F");
      doc.setFillColor(pc.r, pc.g, pc.b);
      doc.circle(w / 2, badgeY, badgeR - 1.6, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.1);
      doc.line(w / 2 - 3, badgeY, w / 2 - 1, badgeY + 2.2);
      doc.line(w / 2 - 1, badgeY + 2.2, w / 2 + 3.5, badgeY - 2.6);

      let y = headerH + badgeR + 8;

      // ── Order details ──────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text("ORDER DETAILS", margin, y);

      // Status pill, right-aligned
      doc.setFillColor(220, 245, 230);
      const pillW = 20;
      doc.roundedRect(w - margin - pillW, y - 4.2, pillW, 6, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(22, 163, 74);
      doc.text("PAID", w - margin - pillW / 2, y, { align: "center" });

      y += 7;
      const meta = [
        { label: "Reference", value: data.reference },
        { label: "Payment ID", value: data.paymentId || "—" },
        { label: "Date", value: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
        { label: "Time", value: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) },
      ];
      const colW = (w - margin * 2) / 2;
      meta.forEach((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = margin + col * colW;
        const ry = y + row * 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(170, 170, 170);
        doc.text(m.label.toUpperCase(), x, ry);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 30, 30);
        doc.text(m.value, x, ry + 4.5);
      });
      y += 24;

      // ── Customer ────────────────────────────────────────────────
      doc.setFillColor(pcLight.r, pcLight.g, pcLight.b);
      const custBoxH = data.customerAddress ? 22 : 16;
      doc.roundedRect(margin, y, w - margin * 2, custBoxH, 3, 3, "F");

      let cy = y + 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("CUSTOMER", margin + 5, cy - 2.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      doc.text(data.customerName || "—", margin + 5, cy + 3);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      const contactBits = [data.customerPhone, data.customerEmail].filter(Boolean).join("   ·   ");
      if (contactBits) doc.text(contactBits, w - margin - 5, cy + 3, { align: "right" });

      if (data.customerAddress) {
        doc.setFontSize(7.8);
        doc.setTextColor(100, 100, 100);
        const addrLines = doc.splitTextToSize(data.customerAddress, w - margin * 2 - 10);
        doc.text(addrLines[0], margin + 5, cy + 9);
      }

      y += custBoxH + 10;

      // ── Items ───────────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text("ITEMS", margin, y);
      y += 6;

      const lines = data.items.map((l) => {
        const parts = l.split(" = ");
        return { product: parts[0], amount: parts[1] ? parts[1].replace("₹", "").trim() : "" };
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      lines.forEach((l) => {
        const prod = l.product.length > 34 ? l.product.slice(0, 33) + "…" : l.product;
        doc.setTextColor(40, 40, 40);
        doc.text(prod, margin, y);
        const amountText = `Rs.${l.amount}`;
        const amountW = doc.getTextWidth(amountText);
        dottedLine(margin + doc.getTextWidth(prod) + 3, w - margin - amountW - 3, y - 1.3);
        doc.setFont("helvetica", "bold");
        doc.text(amountText, w - margin, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        y += 7.5;
      });

      y += 2;

      // ── Total ───────────────────────────────────────────────────
      doc.setFillColor(pc.r, pc.g, pc.b);
      doc.roundedRect(margin, y, w - margin * 2, 15, 3, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Total Paid", margin + 6, y + 9.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Rs.${data.total}`, w - margin - 6, y + 10, { align: "right" });

      // ── Footer ──────────────────────────────────────────────────
      let fy = h - 16;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, fy, w - margin, fy);
      fy += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(pc.r, pc.g, pc.b);
      doc.text("Sellri", w / 2, fy, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(170, 170, 170);
      doc.text("Premium Social Commerce", w / 2, fy + 3.5, { align: "center" });

      if (storeName !== "My Store" && (storePhone || storeEmail)) {
        doc.setFontSize(6);
        doc.setTextColor(160, 160, 160);
        const detailParts = [storePhone, storeEmail].filter(Boolean);
        doc.text(detailParts.join("  |  "), w / 2, fy + 7, { align: "center" });
      }

      doc.setFillColor(pc.r, pc.g, pc.b);
      doc.rect(0, h - 2, w, 2, "F");

      doc.save(`receipt-${data.reference.replace("#", "")}.pdf`);
    });
  }

  function sendWhatsappOrder() {
    if (!seller?.whatsapp || cart.length === 0) return;
    const items = cart.map((i) => `${i.product.name} x${i.quantity} = ₹${i.product.price * i.quantity}`).join("\n");
    const msg = `Hi! I'd like to order:\n\n${items}\n\nTotal: ₹${cartTotal}`;
    window.open(`https://wa.me/91${seller.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    setCart([]);
    setShowCart(false);
  }

  function sendInstagramOrder() {
    if (!seller?.instagram || cart.length === 0) return;
    window.open(`https://ig.me/m/${seller.instagram}`, "_blank");
    setCart([]);
    setShowCart(false);
  }

  function sendOrder() {
    if (seller?.orderMethod === "whatsapp") sendWhatsappOrder();
    else if (seller?.orderMethod === "instagram") sendInstagramOrder();
  }

  function sendCustomOrder() {
    if (seller?.orderMethod === "whatsapp") {
      if (!seller?.whatsapp) return;
      let msg = `Hi! I'd like to place a custom order.`;
      if (customOrderName) msg += `\n\nName: ${customOrderName}`;
      if (customOrderPhone) msg += `\nPhone: ${customOrderPhone}`;
      if (customOrderText) msg += `\n\nDetails: ${customOrderText}`;
      window.open(`https://wa.me/91${seller.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    } else if (seller?.orderMethod === "instagram") {
      if (!seller?.instagram) return;
      window.open(`https://ig.me/m/${seller.instagram}`, "_blank");
    }
    setShowCustomOrder(false);
    setCustomOrderName("");
    setCustomOrderPhone("");
    setCustomOrderText("");
  }

  const isNewStructure = !seller?.storefront || seller.storefront.products != null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div
          className="mb-10 px-6 py-3 rounded-full border inline-flex items-center gap-3"
          style={{ fontFamily: "'Montserrat', sans-serif", borderColor: "#FF9933", backgroundColor: "rgba(255,153,51,0.08)" }}
        >
          <span className="text-base" style={{ color: "#FF9933" }}>&#10022;</span>
          <span className="text-base font-semibold" style={{ color: "#1a1a1a" }}>
            Made with{" "}
            <a
              href="https://sellri.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold transition-colors duration-300 hover:opacity-70"
              style={{ color: "#FF9933" }}
            >
              Sellri
            </a>
          </span>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
          <p className="text-on-surface-variant">Store not found</p>
          <div
            className="mt-8 px-5 py-2.5 rounded-full border inline-flex items-center gap-2"
            style={{ fontFamily: "'Montserrat', sans-serif", borderColor: "#FF9933", backgroundColor: "rgba(255,153,51,0.08)" }}
          >
            <span className="text-xs" style={{ color: "#FF9933" }}>&#10022;</span>
            <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
              Made with{" "}
              <a
                href="https://sellri.in"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold transition-colors duration-300 hover:opacity-70"
                style={{ color: "#FF9933" }}
              >
                Sellri
              </a>
            </span>
          </div>
        </div>
      </>
    );
  }


  // ─── New fixed structure: Navbar → Products → Form → Footer ──────────
  if (isNewStructure) {
    const navbarConfig = seller.storefront?.navbar || {};
    const productsConfig = seller.storefront?.products || {};
    const footerConfig = seller.storefront?.footer || {};
    const primaryColor = seller.storefront?.theme?.primaryColor || "#ff6b35";
    const pageFont = seller.storefront?.theme?.font || "";
    const pageBgType = seller.storefront?.theme?.bgType || "color";
    const pageBgColor = seller.storefront?.theme?.bgColor || "#ffffff";
    const pageBgGradient = seller.storefront?.theme?.bgGradient || "";
    const pageBgImage = seller.storefront?.theme?.bgImage || "";

    return (
      <div style={pageFont ? {
        fontFamily: `"${pageFont}", serif`,
        "--font-label-md": `"${pageFont}", serif`,
        "--font-body-md": `"${pageFont}", serif`,
        "--font-body-lg": `"${pageFont}", serif`,
        "--font-display-lg": `"${pageFont}", serif`,
        "--font-headline-md": `"${pageFont}", serif`,
        "--font-label-sm": `"${pageFont}", serif`,
        "--font-headline-lg": `"${pageFont}", serif`,
        "--font-headline-lg-mobile": `"${pageFont}", serif`,
      } as React.CSSProperties : undefined}>
        <Navbar
          storefrontNavbar={{
            bgColor: navbarConfig.bgColor || "#f68f1d",
            bgImage: navbarConfig.bgImage || "",
            logoURL: navbarConfig.logoURL || "",
            logoHeight: navbarConfig.logoHeight ?? 36,
            logoText: navbarConfig.logoText || seller.name || "",
            logoFont: navbarConfig.logoFont || "Arial",
            logoTextColor: navbarConfig.logoTextColor || "#ffffff",
            trackUrl: "/track",
            policyLinks: [
              { label: "Terms & Conditions", url: `/store/${slug}/policy/terms` },
              { label: "Privacy Policy", url: `/store/${slug}/policy/privacy` },
              { label: "Refunds & Returns", url: `/store/${slug}/policy/refunds` },
            ],
          }}
        />
        <main className="min-h-screen flex flex-col" style={{
          "--color-primary": primaryColor,
          ...(pageBgType === "color" ? { backgroundColor: pageBgColor } : {}),
          ...(pageBgType === "gradient" ? { background: pageBgGradient } : {}),
          ...(pageBgType === "image" && pageBgImage ? { backgroundImage: `url(${pageBgImage})`, backgroundSize: "100% auto", backgroundRepeat: "repeat-y" } : {}),
        } as React.CSSProperties}>
          <div className="w-full mx-auto flex-1" style={{ maxWidth: 1200 }}>
          <ProductsSection
            sellerId={seller.id}
            products={products}
            whatsapp={seller.whatsapp}
            instagram={seller.instagram}
            orderMethod={seller.orderMethod}
            title={productsConfig.title || ""}
            subtitle={productsConfig.subtitle || ""}
            showCategoryFilter={productsConfig.showCategoryFilter ?? true}
            onAddToCart={addToCart}
            bgColor={productsConfig.bgColor || ""}
            bgGradient={productsConfig.bgGradient || ""}
            bgImage={productsConfig.bgImage || ""}
          />
          </div>
          <FooterSection
            storeName={footerConfig.storeName || seller.name || "My Store"}
            logo={footerConfig.logo || ""}
            instagram={footerConfig.instagram || ""}
            whatsapp={footerConfig.whatsapp || ""}
            facebook={footerConfig.facebook || ""}
            copyright={footerConfig.copyright || ""}
            bgColor={footerConfig.bgColor || ""}
            bgGradient={footerConfig.bgGradient || ""}
            bgImage={footerConfig.bgImage || ""}
            termsUrl={slug ? `/store/${slug}/policy/terms` : ""}
            privacyUrl={slug ? `/store/${slug}/policy/privacy` : ""}
            refundsUrl={slug ? `/store/${slug}/policy/refunds` : ""}
            trackUrl="/track"
            phone={footerConfig.phone || ""}
            email={footerConfig.email || ""}
            address={footerConfig.address || ""}
          />
        </main>

        {/* Cart FAB (Razorpay mode) */}
        {seller.orderMethod === "razorpay" && cart.length > 0 && (
          <button
            onClick={() => setShowCart(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: "var(--color-primary, #ff6b35)" }}
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </button>
        )}

        {/* Custom Order FAB */}
        {seller.allowCustomOrders && (
          <button
            onClick={() => setShowCustomOrder(true)}
            className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: seller.orderMethod === "instagram" ? "#8134af" : "#25D366" }}
            title="Custom Order"
          >
            <span className="material-symbols-outlined">edit_note</span>
          </button>
        )}

        {/* Cart Sidebar/Mobile Sheet */}
        {showCart && (
          <>
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:backdrop-blur-none" onClick={() => setShowCart(false)} />
            {/* Desktop sidebar */}
            <div className="fixed top-0 right-0 z-50 h-full w-[440px] max-w-full bg-white shadow-2xl flex flex-col hidden md:flex" style={{ animation: "slideInRight 0.25s ease-out" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20 shrink-0">
                <h2 className="font-headline-md text-lg text-on-surface font-semibold">Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl mb-3" style={{ fontSize: 48 }}>shopping_cart</span>
                    <p className="text-sm">Your cart is empty</p>
                  </div>
                ) : cart.map((item) => (
                  <div key={item.product.id} className="flex gap-4 p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors">
                    <div className="w-20 h-20 rounded-xl bg-white shrink-0 overflow-hidden shadow-sm border border-outline-variant/10">
                      {item.product.photoURL ? (
                        <img src={item.product.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-label-md text-sm text-on-surface font-semibold truncate">{item.product.name}</p>
                      <p className="text-base text-primary font-bold mt-1">₹{item.product.price}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-white text-sm font-bold transition-colors">−</button>
                        <span className="text-sm font-semibold w-8 text-center text-on-surface">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-white text-sm font-bold transition-colors">+</button>
                        <button onClick={() => removeFromCart(item.product.id)} className="ml-auto p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors">
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-6 py-5 border-t border-outline-variant/20 shrink-0 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-on-surface font-medium">Subtotal</span>
                    <span className="font-label-md font-bold text-on-surface text-lg">₹{cartTotal}</span>
                  </div>
                  {delivery && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-on-surface-variant">Delivery</span>
                      <span className={`font-medium ${delivery.isFree ? "text-green-600" : "text-on-surface"}`}>{delivery.isFree ? "FREE" : delivery.charge > 0 ? `₹${delivery.charge}` : "-"}</span>
                    </div>
                  )}
                  {delivery?.freeNote && (
                    <p className="text-xs text-amber-600 text-center">{delivery.freeNote}</p>
                  )}
                  <div className="border-t border-outline-variant/10 pt-3 flex items-center justify-between">
                    <span className="font-label-md text-on-surface font-semibold">Total</span>
                    <span className="font-label-md font-bold text-primary text-xl">₹{delivery ? delivery.total : cartTotal}</span>
                  </div>
                  <button
                    onClick={() => setShowCustomerForm(true)}
                    disabled={ordering}
                    className="w-full py-3.5 rounded-xl font-label-md border-2 font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2 justify-center"
                    style={{ borderColor: "#ff6b35", color: "#ff6b35", backgroundColor: "white" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                    Pay Rs.{delivery ? delivery.total : cartTotal} via Razorpay
                  </button>
                </div>
              )}
            </div>
            {/* Mobile bottom sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] md:hidden" style={{ animation: "slideUp 0.25s ease-out" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 shrink-0">
                <h2 className="font-headline-md text-lg text-on-surface font-semibold">Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl mb-3" style={{ fontSize: 48 }}>shopping_cart</span>
                    <p className="text-sm">Your cart is empty</p>
                  </div>
                ) : cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3 p-3 rounded-xl bg-surface-container-low/60">
                    <div className="w-16 h-16 rounded-xl bg-white shrink-0 overflow-hidden shadow-sm border border-outline-variant/10">
                      {item.product.photoURL ? (
                        <img src={item.product.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-label-md text-sm text-on-surface font-semibold truncate">{item.product.name}</p>
                      <p className="text-sm text-primary font-bold mt-1">₹{item.product.price}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-white text-sm font-bold transition-colors">−</button>
                        <span className="text-sm font-semibold w-6 text-center text-on-surface">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-white text-sm font-bold transition-colors">+</button>
                        <button onClick={() => removeFromCart(item.product.id)} className="ml-auto p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-5 py-4 border-t border-outline-variant/20 shrink-0 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface font-medium">Subtotal</span>
                    <span className="text-sm font-bold text-on-surface">₹{cartTotal}</span>
                  </div>
                  {delivery && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-on-surface-variant">Delivery</span>
                      <span className={`font-medium ${delivery.isFree ? "text-green-600" : "text-on-surface"}`}>{delivery.isFree ? "FREE" : delivery.charge > 0 ? `₹${delivery.charge}` : "-"}</span>
                    </div>
                  )}
                  {delivery?.freeNote && (
                    <p className="text-xs text-amber-600 text-center">{delivery.freeNote}</p>
                  )}
                  <div className="border-t border-outline-variant/10 pt-2 flex items-center justify-between">
                    <span className="font-label-md text-on-surface font-semibold">Total</span>
                    <span className="font-label-md font-bold text-primary text-lg">₹{delivery ? delivery.total : cartTotal}</span>
                  </div>
                  <button
                    onClick={() => setShowCustomerForm(true)}
                    disabled={ordering}
                    className="w-full py-3.5 rounded-xl font-label-md border-2 font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2 justify-center"
                    style={{ borderColor: "#ff6b35", color: "#ff6b35", backgroundColor: "white" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                    Pay Rs.{delivery ? delivery.total : cartTotal} via Razorpay
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Customer Details Form */}
        {showCustomerForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setShowCustomerForm(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-headline-md text-lg text-on-surface font-semibold">Customer Details</h2>
                <button onClick={() => setShowCustomerForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {(!seller?.customerFields || seller.customerFields.name) && (
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1.5">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your name" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                )}
                {seller?.customerFields?.phone && (
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                )}
                {seller?.customerFields?.email && (
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1.5">Email Address</label>
                    <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                )}
                {(seller?.customerFields?.phone || seller?.customerFields?.email) && !customerPhone.trim() && !customerEmail.trim() && (
                  <p className="text-xs text-red-500 text-center">Please provide at least Phone or Email</p>
                )}
                {seller?.customerFields?.address && (
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1.5">Delivery Address <span className="text-red-500">*</span></label>
                    <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} placeholder="Street, city, pincode..." className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm resize-none" />
                  </div>
                )}
                {seller?.customerFields?.message && (
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1.5">Order Note</label>
                    <textarea value={customerMessage} onChange={(e) => setCustomerMessage(e.target.value)} rows={2} placeholder="Any special instructions..." className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white font-body-md text-sm resize-none" />
                  </div>
                )}
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={() => { setShowCustomerForm(false); checkoutRazorpay(); }}
                  disabled={ordering || (!customerName.trim() && (!seller?.customerFields || seller.customerFields.name)) || ((seller?.customerFields?.phone || seller?.customerFields?.email) && !customerPhone.trim() && !customerEmail.trim()) || (seller?.customerFields?.address && !customerAddress.trim())}
                  className="w-full py-3.5 rounded-xl font-label-md border-2 font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer flex items-center gap-2 justify-center"
                  style={{ borderColor: "#ff6b35", color: "#ff6b35", backgroundColor: "white" }}
                >
                  {ordering ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-[#ff6b35]/30 border-t-[#ff6b35] rounded-full animate-spin" /> Processing...</span>
                  ) : (
                    <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span> Pay Rs.{delivery ? delivery.total : cartTotal} via Razorpay</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Order Modal */}
        {showCustomOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCustomOrder(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-headline-md text-lg text-on-surface">Custom Order</h2>
                <button onClick={() => setShowCustomOrder(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block font-label-md text-sm text-on-surface mb-1">Your Name</label>
                  <input type="text" value={customOrderName} onChange={(e) => setCustomOrderName(e.target.value)} placeholder="Enter your name" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                </div>
                <div>
                  <label className="block font-label-md text-sm text-on-surface mb-1">Phone Number</label>
                  <input type="tel" value={customOrderPhone} onChange={(e) => setCustomOrderPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                </div>
                <div>
                  <label className="block font-label-md text-sm text-on-surface mb-1">Order Details</label>
                  <textarea value={customOrderText} onChange={(e) => setCustomOrderText(e.target.value)} rows={4} placeholder="Describe what you'd like to order..." className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm resize-none" />
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={sendCustomOrder}
                  className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                  style={{ backgroundColor: seller?.orderMethod === "instagram" ? "#8134af" : "#25D366" }}
                >
                  {seller?.orderMethod === "instagram" ? "Send via Instagram" : "Send via WhatsApp"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Payment */}
        {processingPayment && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl px-8 py-10 text-center">
              <div className="w-12 h-12 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="font-headline-md text-lg text-on-surface font-semibold mb-1">Processing Payment</h2>
              <p className="text-on-surface-variant text-sm">Please wait while we confirm your order...</p>
            </div>
          </div>
        )}

        {/* Order Confirmation */}
        {orderConfirmed && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setOrderConfirmed(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-green-600" style={{ fontSize: 32 }}>check_circle</span>
                </div>
                <h2 className="font-headline-md text-xl text-on-surface font-semibold mb-1">Order Placed!</h2>
                <p className="text-on-surface-variant text-sm mb-6">Your order has been placed successfully.</p>
                <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Reference</span>
                    <span className="font-bold text-primary text-sm">{orderConfirmed.reference}</span>
                  </div>
                  <div className="border-t border-outline-variant/10" />
                  {orderConfirmed.items.map((line, i) => (
                    <p key={i} className="text-sm text-on-surface">{line}</p>
                  ))}
                  <div className="border-t border-outline-variant/10 pt-2 flex items-center justify-between">
                    <span className="font-label-md text-on-surface font-semibold">Total Paid</span>
                    <span className="font-bold text-primary text-lg">₹{orderConfirmed.total}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => downloadReceipt(orderConfirmed)}
                    className="w-full py-3 rounded-xl font-label-md font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                    style={{ backgroundColor: "#ff6b35", color: "#fff" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                    Download Receipt
                  </button>
                  {seller?.orderMethod === "instagram" ? (
                    seller?.instagram && (
                      <a
                        href={`https://ig.me/m/${seller.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 justify-center"
                        style={{ background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                        Contact Seller on Instagram
                      </a>
                    )
                  ) : seller?.whatsapp && (
                    <a
                      href={`https://wa.me/91${seller.whatsapp}?text=${encodeURIComponent(`Hi! I've placed an order (${orderConfirmed.reference}) of ₹${orderConfirmed.total}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 justify-center"
                      style={{ backgroundColor: "#25D366" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                      Contact Seller on WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => setOrderConfirmed(null)}
                    className="w-full py-3 rounded-xl font-label-md text-on-surface-variant border border-outline hover:text-on-surface transition-all cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Legacy / fallback mode ──────────────────────────────────────────
  const primaryColor = seller.storefront?.theme?.primaryColor || "#ff6b35";
  const pageFont = seller.storefront?.theme?.font || "";
  return (
    <div style={pageFont ? {
        fontFamily: `"${pageFont}", serif`,
        "--font-label-md": `"${pageFont}", serif`,
        "--font-body-md": `"${pageFont}", serif`,
        "--font-body-lg": `"${pageFont}", serif`,
        "--font-display-lg": `"${pageFont}", serif`,
        "--font-headline-md": `"${pageFont}", serif`,
        "--font-label-sm": `"${pageFont}", serif`,
        "--font-headline-lg": `"${pageFont}", serif`,
        "--font-headline-lg-mobile": `"${pageFont}", serif`,
      } as React.CSSProperties : undefined}>
      <Navbar
        storefrontNavbar={{
          bgColor: seller.storefront?.navbar?.bgColor || "#f68f1d",
          bgImage: seller.storefront?.navbar?.bgImage || "",
          logoURL: seller.storefront?.navbar?.logoURL || "",
          logoHeight: seller.storefront?.navbar?.logoHeight ?? 36,
          logoText: seller.storefront?.navbar?.logoText || seller.name || "",
          logoFont: seller.storefront?.navbar?.logoFont || "Arial",
          logoTextColor: seller.storefront?.navbar?.logoTextColor || "#ffffff",
          trackUrl: "/track",
          policyLinks: [
            { label: "Terms & Conditions", url: `/store/${slug}/policy/terms` },
            { label: "Privacy Policy", url: `/store/${slug}/policy/privacy` },
            { label: "Refunds & Returns", url: `/store/${slug}/policy/refunds` },
          ],
        }}
      />
      <main className="min-h-screen bg-surface" style={{ "--color-primary": primaryColor } as React.CSSProperties}>

        <div className="max-w-4xl mx-auto px-4 pb-16">
          {/* Category filter */}
          {products.length > 0 && (
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setActiveCat("")}
                className={`px-4 py-2 rounded-xl text-sm font-label-md transition-all cursor-pointer ${!activeCat ? "text-white" : "border border-outline text-on-surface-variant hover:text-on-surface"}`}
                style={!activeCat ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-label-md transition-all cursor-pointer ${activeCat === cat ? "text-white" : "border border-outline text-on-surface-variant hover:text-on-surface"}`}
                  style={activeCat === cat ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">inventory_2</span>
              <p className="text-on-surface-variant">No products yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer" onClick={() => setSelectedProduct(product)}>
                  <div className="aspect-[1/1] bg-gradient-to-br from-surface-container-low to-surface overflow-hidden shrink-0 relative">
                    {product.photoURL ? (
                      <img src={product.photoURL} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/15">
                        <span className="material-symbols-outlined text-5xl">image</span>
                      </div>
                    )}
                    {product.category && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[11px] font-label-md font-semibold text-on-surface shadow-sm">
                        {product.category}
                      </span>
                    )}
                    {product.photoURLs && product.photoURLs.length > 1 && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[11px] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>collections</span>
                        {product.photoURLs.length}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center rounded-xl">
                      <span className="text-white text-sm font-semibold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                        Product details
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-4 gap-1">
                    <h3 className="font-label-md font-medium text-on-surface text-base leading-snug line-clamp-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-on-surface-variant/70 line-clamp-2 leading-relaxed">{product.description}</p>
                    )}
                    <div className="mt-auto pt-3">
                      <span className="font-label-md font-semibold text-primary text-lg tracking-tight">₹{product.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <FooterSection
        storeName={seller.name || "My Store"}
        termsUrl={slug ? `/store/${slug}/policy/terms` : ""}
        privacyUrl={slug ? `/store/${slug}/policy/privacy` : ""}
        refundsUrl={slug ? `/store/${slug}/policy/refunds` : ""}
        trackUrl="/track"
      />

      {/* Cart FAB (Razorpay mode) */}
      {seller.orderMethod === "razorpay" && cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          style={{ backgroundColor: "var(--color-primary, #ff6b35)" }}
        >
          <span className="material-symbols-outlined">shopping_cart</span>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
        </button>
      )}

      {/* Custom Order FAB */}
      {seller.allowCustomOrders && (
        <button
          onClick={() => setShowCustomOrder(true)}
          className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          style={{ backgroundColor: seller.orderMethod === "instagram" ? "#8134af" : "#25D366" }}
          title="Custom Order"
        >
          <span className="material-symbols-outlined">edit_note</span>
        </button>
      )}

      {/* Custom Order Modal */}
      {showCustomOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCustomOrder(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <h2 className="font-headline-md text-lg text-on-surface">Custom Order</h2>
              <button onClick={() => setShowCustomOrder(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Your Name</label>
                <input type="text" value={customOrderName} onChange={(e) => setCustomOrderName(e.target.value)} placeholder="Enter your name" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
              </div>
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Phone Number</label>
                <input type="tel" value={customOrderPhone} onChange={(e) => setCustomOrderPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
              </div>
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Order Details</label>
                <textarea value={customOrderText} onChange={(e) => setCustomOrderText(e.target.value)} rows={4} placeholder="Describe what you'd like to order..." className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={sendCustomOrder}
                className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                style={{ backgroundColor: seller?.orderMethod === "instagram" ? "#8134af" : "#25D366" }}
              >
                {seller?.orderMethod === "instagram" ? "Send via Instagram" : "Send via WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal (legacy mode) */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          whatsapp={seller?.whatsapp || ""}
          instagram={seller?.instagram || ""}
          orderMethod={seller?.orderMethod || "whatsapp"}
        />
      )}

      {/* Processing Payment (legacy mode) */}
      {processingPayment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl px-8 py-10 text-center">
            <div className="w-12 h-12 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="font-headline-md text-lg text-on-surface font-semibold mb-1">Processing Payment</h2>
            <p className="text-on-surface-variant text-sm">Please wait while we confirm your order...</p>
          </div>
        </div>
      )}

      {/* Order Confirmation (legacy mode) */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setOrderConfirmed(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600" style={{ fontSize: 32 }}>check_circle</span>
              </div>
              <h2 className="font-headline-md text-xl text-on-surface font-semibold mb-1">Order Placed!</h2>
              <p className="text-on-surface-variant text-sm mb-6">Your order has been placed successfully.</p>
              <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">Reference</span>
                  <span className="font-bold text-primary text-sm">{orderConfirmed.reference}</span>
                </div>
                <div className="border-t border-outline-variant/10" />
                {orderConfirmed.items.map((line, i) => (
                  <p key={i} className="text-sm text-on-surface">{line}</p>
                ))}
                <div className="border-t border-outline-variant/10 pt-2 flex items-center justify-between">
                  <span className="font-label-md text-on-surface font-semibold">Total Paid</span>
                  <span className="font-bold text-primary text-lg">₹{orderConfirmed.total}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => downloadReceipt(orderConfirmed)}
                  className="w-full py-3 rounded-xl font-label-md font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                  style={{ backgroundColor: "#ff6b35", color: "#fff" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                  Download Receipt
                </button>
                {seller?.orderMethod === "instagram" ? (
                  seller?.instagram && (
                    <a
                      href={`https://ig.me/m/${seller.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 justify-center"
                      style={{ background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                      Contact Seller on Instagram
                    </a>
                  )
                ) : seller?.whatsapp && (
                  <a
                    href={`https://wa.me/91${seller.whatsapp}?text=${encodeURIComponent(`Hi! I've placed an order (${orderConfirmed.reference}) of ₹${orderConfirmed.total}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 justify-center"
                    style={{ backgroundColor: "#25D366" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                    Contact Seller on WhatsApp
                  </a>
                )}
                <button
                  onClick={() => setOrderConfirmed(null)}
                  className="w-full py-3 rounded-xl font-label-md text-on-surface-variant border border-outline hover:text-on-surface transition-all cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}