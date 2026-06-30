"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, orderBy, getDocs, limit, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProductsSection, { ProductDetailModal } from "@/components/sections/ProductsSection";
import FooterSection from "@/components/sections/FooterSection";
import FormSection from "@/components/sections/FormSection";
import useGoogleFont from "@/hooks/useGoogleFont";
import { useLockBody } from "@/hooks/useLockBody";

type Section = {
  id: string;
  type: "hero" | "products" | "carousel" | "text" | "form" | "footer";
  props: Record<string, any>;
};

type Seller = {
  id: string;
  name: string;
  bio: string;
  photoURL: string;
  whatsapp: string;
  orderMethod: "whatsapp" | "razorpay";
  razorpayKeyId: string;
  allowCustomOrders: boolean;
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

  useGoogleFont(seller?.storefront?.theme?.font || "");

  useLockBody(showCart || showCustomOrder || !!selectedProduct);

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

    const sellerData = {
      id: sellerId,
      name: data.name || "My Store",
      bio: data.bio || "",
      photoURL: data.photoURL || "",
      whatsapp: data.whatsapp || "",
      orderMethod: data.orderMethod || "whatsapp",
      razorpayKeyId: data.razorpayKeyId || "",
      allowCustomOrders: data.allowCustomOrders ?? false,
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

  async function checkoutRazorpay() {
    if (!seller?.razorpayKeyId || cart.length === 0) return;
    setOrdering(true);

    try {
      const rzp = new (window as any).Razorpay({
        key: seller.razorpayKeyId,
        amount: Math.round(cartTotal * 100),
        currency: "INR",
        name: seller.name,
        description: `Order of ${cart.length} product(s)`,
        prefill: { contact: "", email: "" },
        handler: () => {
          const items = cart.map((i) => `${i.product.name} x${i.quantity} = ₹${i.product.price * i.quantity}`).join("\n");
          const msg = `Order placed!\n\n${items}\nTotal: ₹${cartTotal}`;
          setCart([]);
          setShowCart(false);
          alert(msg);
        },
        modal: { ondismiss: () => setOrdering(false) },
        theme: { color: "#ff6b35" },
      });
      rzp.open();
    } catch {
      alert("Payment failed. Please try again.");
    } finally {
      setOrdering(false);
    }
  }

  function sendWhatsappOrder() {
    if (!seller?.whatsapp || cart.length === 0) return;
    const items = cart.map((i) => `${i.product.name} x${i.quantity} = ₹${i.product.price * i.quantity}`).join("\n");
    const msg = `Hi! I'd like to order:\n\n${items}\n\nTotal: ₹${cartTotal}`;
    window.open(`https://wa.me/91${seller.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    setCart([]);
    setShowCart(false);
  }

  function sendCustomOrder() {
    if (!seller?.whatsapp) return;
    let msg = `Hi! I'd like to place a custom order.`;
    if (customOrderName) msg += `\n\nName: ${customOrderName}`;
    if (customOrderPhone) msg += `\nPhone: ${customOrderPhone}`;
    if (customOrderText) msg += `\n\nDetails: ${customOrderText}`;
    window.open(`https://wa.me/91${seller.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    setShowCustomOrder(false);
    setCustomOrderName("");
    setCustomOrderPhone("");
    setCustomOrderText("");
  }

  const isNewStructure = seller?.storefront?.products != null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <p className="text-on-surface-variant">Store not found</p>
        </div>
      </>
    );
  }


  // ─── New fixed structure: Navbar → Products → Form → Footer ──────────
  if (isNewStructure) {
    const navbarConfig = seller.storefront!.navbar;
    const productsConfig = seller.storefront!.products || {};
    const formConfig = seller.storefront!.form || {};
    const footerConfig = seller.storefront!.footer || {};
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
            logoPosition: navbarConfig.logoPosition || "center",
            bgColor: navbarConfig.bgColor || "#f68f1d",
            bgImage: navbarConfig.bgImage || "",
            logoURL: navbarConfig.logoURL || "",
            logoHeight: navbarConfig.logoHeight ?? 36,
            logoText: navbarConfig.logoText || "",
            logoFont: navbarConfig.logoFont || "Arial",
            logoTextColor: navbarConfig.logoTextColor || "#ffffff",
          }}
        />
        <main className="min-h-screen" style={{
          "--color-primary": primaryColor,
          ...(pageBgType === "color" ? { backgroundColor: pageBgColor } : {}),
          ...(pageBgType === "gradient" ? { background: pageBgGradient } : {}),
          ...(pageBgType === "image" && pageBgImage ? { backgroundImage: `url(${pageBgImage})`, backgroundSize: "100% auto", backgroundRepeat: "repeat-y" } : {}),
        } as React.CSSProperties}>
          <div className="w-full mx-auto" style={{ maxWidth: 1200 }}>
          <ProductsSection
            sellerId={seller.id}
            products={products}
            whatsapp={seller.whatsapp}
            orderMethod={seller.orderMethod}
            title={productsConfig.title || ""}
            subtitle={productsConfig.subtitle || ""}
            showCategoryFilter={productsConfig.showCategoryFilter ?? true}
            onAddToCart={addToCart}
            bgColor={productsConfig.bgColor || ""}
            bgGradient={productsConfig.bgGradient || ""}
            bgImage={productsConfig.bgImage || ""}
          />
          <div className="border-t border-outline-variant/10" />
          <FormSection
            title={formConfig.title || "Contact Us"}
            description={formConfig.description || ""}
            contactMethod={formConfig.contactMethod || "whatsapp"}
            whatsapp={formConfig.whatsapp || ""}
            showWhatsappContact={formConfig.showWhatsappContact ?? false}
            recipientEmail={formConfig.recipientEmail || ""}
            buttonLabel={formConfig.buttonLabel || "Send Inquiry"}
            phone={formConfig.phone || ""}
            email={formConfig.email || ""}
            address={formConfig.address || ""}
            bgColor={formConfig.bgColor || ""}
            bgGradient={formConfig.bgGradient || ""}
            bgImage={formConfig.bgImage || ""}
            primaryColor={primaryColor}
          />
          <div className="border-t border-outline-variant/10" />
          <FooterSection
            storeName={footerConfig.storeName || "My Store"}
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
            phone={footerConfig.phone || ""}
            email={footerConfig.email || ""}
            address={footerConfig.address || ""}
          />
          </div>
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
            style={{ backgroundColor: "#25D366" }}
            title="Custom Order"
          >
            <span className="material-symbols-outlined">edit_note</span>
          </button>
        )}

        {/* Cart Modal */}
        {showCart && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCart(false)}>
            <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
                <h2 className="font-headline-md text-lg text-on-surface">Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-surface-container-low shrink-0 overflow-hidden">
                      {item.product.photoURL ? (
                        <img src={item.product.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-md text-sm text-on-surface truncate">{item.product.name}</p>
                      <p className="text-sm text-primary font-bold">₹{item.product.price}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-surface-container-low text-sm font-bold">−</button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-surface-container-low text-sm font-bold">+</button>
                        <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-red-400 hover:text-red-500 cursor-pointer">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-on-surface">Total</span>
                  <span className="font-label-md font-bold text-primary text-lg">₹{cartTotal}</span>
                </div>
                <button
                  onClick={checkoutRazorpay} disabled={ordering}
                  className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: "var(--color-primary, #ff6b35)", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
                >
                  {ordering ? "Processing..." : `Pay ₹${cartTotal}`}
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
                  style={{ backgroundColor: "#25D366" }}
                >
                  Send via WhatsApp
                </button>
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
          logoPosition: seller.storefront?.navbar?.logoPosition || "center",
          bgColor: seller.storefront?.navbar?.bgColor || "#f68f1d",
          bgImage: seller.storefront?.navbar?.bgImage || "",
          logoURL: seller.storefront?.navbar?.logoURL || "",
          logoHeight: seller.storefront?.navbar?.logoHeight ?? 36,
          logoText: seller.storefront?.navbar?.logoText || "",
          logoFont: seller.storefront?.navbar?.logoFont || "Arial",
          logoTextColor: seller.storefront?.navbar?.logoTextColor || "#ffffff",
        }}
      />
      <main className="min-h-screen bg-surface" style={{ "--color-primary": primaryColor } as React.CSSProperties}>
        {/* Seller header */}
        <div className="bg-gradient-to-br from-primary-fixed/20 via-surface to-surface">
          <div className="max-w-4xl mx-auto px-4 py-10 md:py-16 text-center">
            {seller.photoURL && (
              <img src={seller.photoURL} alt={seller.name} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-md" />
            )}
            <h1 className="font-display-lg text-2xl md:text-4xl text-on-surface mb-2">{seller.name}</h1>
            {seller.bio && <p className="text-on-surface-variant max-w-md mx-auto">{seller.bio}</p>}
          </div>
        </div>

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
          style={{ backgroundColor: "#25D366" }}
          title="Custom Order"
        >
          <span className="material-symbols-outlined">edit_note</span>
        </button>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCart(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
              <h2 className="font-headline-md text-lg text-on-surface">Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
              <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-surface-container-low shrink-0 overflow-hidden">
                    {item.product.photoURL ? (
                      <img src={item.product.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                        <span className="material-symbols-outlined">image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-sm text-on-surface truncate">{item.product.name}</p>
                    <p className="text-sm text-primary font-bold">₹{item.product.price}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-surface-container-low text-sm font-bold">−</button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-outline flex items-center justify-center cursor-pointer hover:bg-surface-container-low text-sm font-bold">+</button>
                      <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-red-400 hover:text-red-500 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-on-surface">Total</span>
                <span className="font-label-md font-bold text-primary text-lg">₹{cartTotal}</span>
              </div>
              <button
                onClick={checkoutRazorpay} disabled={ordering}
                className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: "var(--color-primary, #ff6b35)", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
              >
                {ordering ? "Processing..." : `Pay ₹${cartTotal}`}
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
                style={{ backgroundColor: "#25D366" }}
              >
                Send via WhatsApp
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
          orderMethod={seller?.orderMethod || "whatsapp"}
        />
      )}
    </div>
  );
}
