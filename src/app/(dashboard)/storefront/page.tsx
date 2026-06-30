"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import ProductsSection from "@/components/sections/ProductsSection";
import FormSection from "@/components/sections/FormSection";
import FooterSection from "@/components/sections/FooterSection";
import useGoogleFont, { GOOGLE_FONTS } from "@/hooks/useGoogleFont";
import { POLICY_LABELS, POLICY_DEFAULTS, fillPolicyTemplate, type PolicyType } from "@/lib/policyTemplates";
import { useLockBody } from "@/hooks/useLockBody";

export default function StorefrontPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerWhatsapp, setSellerWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ─── Navbar ────────────────────────────────────────────────────────────
  const [logoPosition, setLogoPosition] = useState<"left" | "center" | "right">("center");
  const [navbarBgColor, setNavbarBgColor] = useState("#f68f1d");
  const [navbarBgImage, setNavbarBgImage] = useState("");
  const [navbarLogoURL, setNavbarLogoURL] = useState("");
  const [navbarLogoHeight, setNavbarLogoHeight] = useState(36);
  const [navbarLogoText, setNavbarLogoText] = useState("");
  const [navbarLogoFont, setNavbarLogoFont] = useState("Arial");
  const [navbarLogoTextColor, setNavbarLogoTextColor] = useState("#ffffff");

  // ─── Theme ─────────────────────────────────────────────────────────────
  const [primaryColor, setPrimaryColor] = useState("#ff6b35");
  const [pageFont, setPageFont] = useState("Arial");
  const [pageBgType, setPageBgType] = useState<"color" | "gradient" | "image">("color");
  const [pageBgColor, setPageBgColor] = useState("#ffffff");
  const [pageBgGradient, setPageBgGradient] = useState("");
  const [pageBgImage, setPageBgImage] = useState("");
  const [storeSlug, setStoreSlug] = useState("");

  // ─── Products Section ──────────────────────────────────────────────────
  const [productsTitle, setProductsTitle] = useState("");
  const [productsSubtitle, setProductsSubtitle] = useState("");
  const [productsShowFilter, setProductsShowFilter] = useState(true);
  const [productsBgColor, setProductsBgColor] = useState("");
  const [productsBgGradient, setProductsBgGradient] = useState("");
  const [productsBgImage, setProductsBgImage] = useState("");

  // ─── Form Section ──────────────────────────────────────────────────────
  const [formTitle, setFormTitle] = useState("Contact Us");
  const [formDescription, setFormDescription] = useState("");
  const [formContactMethod, setFormContactMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formShowWhatsappContact, setFormShowWhatsappContact] = useState(false);
  const [formRecipientEmail, setFormRecipientEmail] = useState("");
  const [formButtonLabel, setFormButtonLabel] = useState("Send Inquiry");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formBgColor, setFormBgColor] = useState("");
  const [formBgGradient, setFormBgGradient] = useState("");
  const [formBgImage, setFormBgImage] = useState("");

  // ─── Footer Section ────────────────────────────────────────────────────
  const [footerStoreName, setFooterStoreName] = useState("My Store");
  const [footerLogo, setFooterLogo] = useState("");
  const [footerInstagram, setFooterInstagram] = useState("");
  const [footerWhatsapp, setFooterWhatsapp] = useState("");
  const [footerFacebook, setFooterFacebook] = useState("");
  const [footerCopyright, setFooterCopyright] = useState("");
  const [footerBgColor, setFooterBgColor] = useState("");
  const [footerBgGradient, setFooterBgGradient] = useState("");
  const [footerBgImage, setFooterBgImage] = useState("");
  const [footerPhone, setFooterPhone] = useState("");
  const [footerEmail, setFooterEmail] = useState("");
  const [footerAddress, setFooterAddress] = useState("");

  // ─── Policies ──────────────────────────────────────────────────────────
  const [policyTermsContent, setPolicyTermsContent] = useState("");
  const [policyPrivacyContent, setPolicyPrivacyContent] = useState("");
  const [policyRefundsContent, setPolicyRefundsContent] = useState("");

  useGoogleFont(navbarLogoFont);
  useGoogleFont(pageFont);

  const GRADIENT_PRESETS = [
    { name: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { name: "Ocean", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { name: "Forest", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
    { name: "Lavender", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { name: "Warm", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
    { name: "Cool", value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
  ];

  // Upload states
  const [logoUploading, setLogoUploading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [pageBgUploading, setPageBgUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const pageBgInputRef = useRef<HTMLInputElement>(null);

  const [editSection, setEditSection] = useState<"navbar" | "products" | "form" | "footer" | "policies" | null>(null);

  useLockBody(!!editSection);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const stored = localStorage.getItem("sellri_user");
    if (!stored) { router.push("/signin"); return; }
    const u = JSON.parse(stored);
    setUser(u);
    getDoc(doc(db, "users", u.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSellerName(data?.name || "");
        setSellerWhatsapp(data?.whatsapp || "");
        setStoreSlug(data?.slug || "");
        const sf = data?.storefront;
        if (sf) {
          // Navbar
          setLogoPosition(sf.navbar?.logoPosition || "center");
          setNavbarBgColor(sf.navbar?.bgColor || "#f68f1d");
          setNavbarBgImage(sf.navbar?.bgImage || "");
          setNavbarLogoURL(sf.navbar?.logoURL || "");
          setNavbarLogoHeight(sf.navbar?.logoHeight ?? 36);
          setNavbarLogoText(sf.navbar?.logoText || "");
          setNavbarLogoFont(sf.navbar?.logoFont || "Arial");
          setNavbarLogoTextColor(sf.navbar?.logoTextColor || "#ffffff");

          // Theme
          setPrimaryColor(sf.theme?.primaryColor || "#ff6b35");
          setPageFont(sf.theme?.font || "Arial");
          setPageBgType(sf.theme?.bgType || "color");
          setPageBgColor(sf.theme?.bgColor || "#ffffff");
          setPageBgGradient(sf.theme?.bgGradient || "");
          setPageBgImage(sf.theme?.bgImage || "");

          // Products section
          const p = sf.products || {};
          setProductsTitle(p.title || "");
          setProductsSubtitle(p.subtitle || "");
          setProductsShowFilter(p.showCategoryFilter ?? true);
          setProductsBgColor(p.bgColor || "");
          setProductsBgGradient(p.bgGradient || "");
          setProductsBgImage(p.bgImage || "");

          // Form section
          const f = sf.form || {};
          setFormTitle(f.title || "Contact Us");
          setFormDescription(f.description || "");
          setFormContactMethod(f.contactMethod || "whatsapp");
          setFormWhatsapp(f.whatsapp || "");
          setFormShowWhatsappContact(f.showWhatsappContact ?? false);
          setFormRecipientEmail(f.recipientEmail || "");
          setFormButtonLabel(f.buttonLabel || "Send Inquiry");
          setFormPhone(f.phone || "");
          setFormEmail(f.email || "");
          setFormAddress(f.address || "");
          setFormBgColor(f.bgColor || "");
          setFormBgGradient(f.bgGradient || "");
          setFormBgImage(f.bgImage || "");

          // Footer section
          const ft = sf.footer || {};
          setFooterStoreName(ft.storeName || "My Store");
          setFooterLogo(ft.logo || "");
          setFooterInstagram(ft.instagram || "");
          setFooterWhatsapp(ft.whatsapp || "");
          setFooterFacebook(ft.facebook || "");
          setFooterCopyright(ft.copyright || "");
          setFooterBgColor(ft.bgColor || "");
          setFooterBgGradient(ft.bgGradient || "");
          setFooterBgImage(ft.bgImage || "");
          setFooterPhone(ft.phone || "");
          setFooterEmail(ft.email || "");
          setFooterAddress(ft.address || "");

          // Policies
          const pol = sf.policies || {};
          setPolicyTermsContent(pol.terms?.content || "");
          setPolicyPrivacyContent(pol.privacy?.content || "");
          setPolicyRefundsContent(pol.refunds?.content || "");
        }
      }
      setLoading(false);
    });
  }, [router]);

  async function uploadFile(file: File | Blob, path: string, maxPx?: number): Promise<string> {
    let blob = file;
    if (maxPx) {
      const img = await createImageBitmap(file);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      img.close();
      blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85)
      );
    }
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLogoUploading(true);
    try {
      const url = await uploadFile(file, `storefront/${user.uid}/logo`);
      setNavbarLogoURL(url);
    } finally {
      setLogoUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBgUploading(true);
    try {
      const url = await uploadFile(file, `storefront/${user.uid}/bg`);
      setNavbarBgImage(url);
    } finally {
      setBgUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  async function handlePageBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPageBgUploading(true);
    try {
      const url = await uploadFile(file, `storefront/${user.uid}/pagebg`);
      setPageBgImage(url);
    } finally {
      setPageBgUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        storefront: {
          navbar: {
            logoPosition,
            bgColor: navbarBgColor,
            bgImage: navbarBgImage,
            logoURL: navbarLogoURL,
            logoHeight: navbarLogoHeight,
            logoText: navbarLogoText,
            logoFont: navbarLogoFont,
            logoTextColor: navbarLogoTextColor,
          },
          products: {
            title: productsTitle,
            subtitle: productsSubtitle,
            showCategoryFilter: productsShowFilter,
            bgColor: productsBgColor,
            bgGradient: productsBgGradient,
            bgImage: productsBgImage,
          },
          form: {
            title: formTitle,
            description: formDescription,
            contactMethod: formContactMethod,
            whatsapp: formWhatsapp,
            showWhatsappContact: formShowWhatsappContact,
            recipientEmail: formRecipientEmail,
            buttonLabel: formButtonLabel,
            phone: formPhone,
            email: formEmail,
            address: formAddress,
            bgColor: formBgColor,
            bgGradient: formBgGradient,
            bgImage: formBgImage,
          },
          footer: {
            storeName: footerStoreName,
            logo: footerLogo,
            instagram: footerInstagram,
            whatsapp: footerWhatsapp,
            facebook: footerFacebook,
            copyright: footerCopyright,
            bgColor: footerBgColor,
            bgGradient: footerBgGradient,
            bgImage: footerBgImage,
            phone: footerPhone,
            email: footerEmail,
            address: footerAddress,
          },
          policies: {
            terms: { content: policyTermsContent },
            privacy: { content: policyPrivacyContent },
            refunds: { content: policyRefundsContent },
          },
          theme: {
            primaryColor,
            font: pageFont,
            bgType: pageBgType,
            bgColor: pageBgColor,
            bgGradient: pageBgGradient,
            bgImage: pageBgImage,
          },
        },
        updatedAt: serverTimestamp(),
      });
      showToast("Storefront saved!", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-on-surface-variant">Loading...</p></div>;
  }

  return (
    <>
    <div className="max-w-4xl mx-auto py-4 md:py-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-label-md transition-all ${
            toast.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span className={`material-symbols-outlined ${toast.type === "success" ? "text-green-600" : "text-red-600"}`} style={{ fontSize: 20 }}>
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display-lg text-3xl text-on-surface">Storefront</h1>
          <p className="text-on-surface-variant">Customise how your store looks to customers.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 py-3 px-6 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          style={{ backgroundColor: "var(--color-primary, #ff6b35)", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ─── Theme ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-sm mb-6">
        <h2 className="font-headline-md text-lg text-on-surface mb-4">Theme</h2>
        <div>
          <label className="block font-label-md text-sm text-on-surface mb-2">Primary Colour</label>
          <p className="text-xs text-on-surface-variant mb-3">Used for buttons, highlights, and accents throughout your store.</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-12 rounded-xl border border-outline cursor-pointer bg-transparent p-1"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#ff6b35"
              className="flex-1 px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm"
            />
            <button
              onClick={() => setPrimaryColor("#ff6b35")}
              className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer font-label-md shrink-0"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-outline-variant/20">
          <label className="block font-label-md text-sm text-on-surface mb-2">Page Font</label>
          <p className="text-xs text-on-surface-variant mb-3">Font used for all text on your store page (except logo).</p>
          <select
            value={pageFont}
            onChange={(e) => setPageFont(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm"
          >
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Impact">Impact</option>
            <option value="Playfair Display">Playfair Display</option>
            <option value="Poppins">Poppins</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Lobster">Lobster</option>
            <option value="Pacifico">Pacifico</option>
            <option value="Dancing Script">Dancing Script</option>
            <option value="Bebas Neue">Bebas Neue</option>
          </select>
          <p className="mt-3 text-lg rounded-xl border border-outline-variant/20 p-4 text-center" style={{ fontFamily: `"${pageFont}", serif` }}>
            {pageFont}
          </p>
        </div>

        <div className="mt-5 pt-5 border-t border-outline-variant/20">
          <label className="block font-label-md text-sm text-on-surface mb-2">Page Background</label>
          <p className="text-xs text-on-surface-variant mb-3">Background for your entire store page.</p>
          <div className="flex gap-3 mb-4">
            {(["color", "gradient", "image"] as const).map((t) => (
              <button key={t} onClick={() => setPageBgType(t)} className={`flex-1 py-2 rounded-xl text-sm font-label-md transition-all cursor-pointer capitalize ${pageBgType === t ? "text-white" : "border border-outline text-on-surface-variant hover:text-on-surface"}`} style={pageBgType === t ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}>{t}</button>
            ))}
          </div>
          {pageBgType === "color" && (
            <div className="flex items-center gap-3">
              <input type="color" value={pageBgColor} onChange={(e) => setPageBgColor(e.target.value)} className="w-12 h-12 rounded-xl border border-outline cursor-pointer bg-transparent p-1" />
              <input type="text" value={pageBgColor} onChange={(e) => setPageBgColor(e.target.value)} placeholder="#ffffff" className="flex-1 px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
            </div>
          )}
          {pageBgType === "gradient" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {GRADIENT_PRESETS.map((g) => (
                  <button key={g.name} onClick={() => setPageBgGradient(g.value)} className={`p-2 rounded-xl text-[10px] font-label-md transition-all cursor-pointer border ${pageBgGradient === g.value ? "border-primary" : "border-outline text-on-surface-variant"}`}>
                    <span className="block w-full h-8 rounded-lg mb-1" style={{ background: g.value }} />
                    {g.name}
                  </button>
                ))}
              </div>
              <div>
                <label className="block font-label-md text-xs text-on-surface mb-1">Custom gradient CSS</label>
                <input type="text" value={pageBgGradient} onChange={(e) => setPageBgGradient(e.target.value)} placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
              </div>
            </div>
          )}
          {pageBgType === "image" && (
            <div>
              <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${pageBgUploading ? "opacity-60 pointer-events-none" : "hover:border-primary"} ${pageBgImage ? "border-primary" : "border-outline-variant"}`} onClick={() => pageBgInputRef.current?.click()}>
                {pageBgUploading ? (
                  <p className="text-sm text-on-surface-variant">Uploading...</p>
                ) : pageBgImage ? (
                  <div className="flex items-center gap-3 justify-center">
                    <div className="h-16 w-24 rounded-lg overflow-hidden border border-outline/10" style={{ backgroundImage: `url(${pageBgImage})`, backgroundSize: "100% auto", backgroundRepeat: "repeat-y" }} />
                    <button onClick={(e) => { e.stopPropagation(); setPageBgImage(""); }} className="text-xs text-red-500 hover:text-red-600 font-label-md cursor-pointer">Remove</button>
                  </div>
                ) : (
                  <div>
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-1">cloud_upload</span>
                    <p className="text-sm text-on-surface-variant">Upload a background image</p>
                  </div>
                )}
                <input ref={pageBgInputRef} type="file" accept="image/*" className="hidden" onChange={handlePageBgUpload} />
              </div>
              {pageBgImage && <p className="text-xs text-on-surface-variant mt-2">Image will repeat vertically at full width.</p>}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section Cards ────────────────────────────────────────────────── */}
      <div className="space-y-3 mb-6">
        {([
          { key: "navbar" as const, icon: "menu", label: "Navbar", summary: navbarLogoText || (navbarLogoURL ? "Custom logo" : "No logo") },
          { key: "products" as const, icon: "inventory_2", label: "Products Section", summary: productsTitle || "All products" },
          { key: "form" as const, icon: "contact_support", label: "Contact Form Section", summary: formTitle || "Contact form" },
          { key: "footer" as const, icon: "bottom_panel_close", label: "Footer Section", summary: footerStoreName || "Footer" },
          { key: "policies" as const, icon: "description", label: "Policy Pages", summary: policyTermsContent ? "Customised" : "Default templates" },
        ]).map(({ key, icon, label, summary }) => (
          <div key={key} className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/20 bg-white shadow-sm">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-sm font-semibold text-on-surface">{label}</p>
              <p className="text-xs text-on-surface-variant truncate">{summary}</p>
            </div>
            <button
              onClick={() => setEditSection(key)}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>edit</span>
            </button>
          </div>
        ))}
      </div>

      {/* ─── Save Button (bottom) ────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 py-3 px-6 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          style={{ backgroundColor: "var(--color-primary, #ff6b35)", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>

      {/* ─── Section Edit Modal ──────────────────────────────────────────── */}
      {editSection && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditSection(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 shrink-0">
              <h2 className="font-headline-md text-lg text-on-surface">
                {editSection === "navbar" && "Configure Navbar"}
                {editSection === "products" && "Configure Products Section"}
                {editSection === "form" && "Configure Contact Form"}
                {editSection === "footer" && "Configure Footer"}
                {editSection === "policies" && "Edit Policy Pages"}
              </h2>
              <button onClick={() => setEditSection(null)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {editSection === "navbar" && (
                <>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-2">Custom Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden bg-surface-container-low shrink-0 cursor-pointer hover:border-primary transition-colors" onClick={() => logoInputRef.current?.click()}>
                        {navbarLogoURL ? (
                          <img src={navbarLogoURL} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant/40">add_photo_alternate</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {logoUploading ? (
                          <p className="text-sm text-on-surface-variant">Uploading...</p>
                        ) : navbarLogoURL ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-on-surface-variant truncate">Custom logo set</span>
                            <button onClick={() => { setNavbarLogoURL(""); }} className="text-xs text-red-500 hover:text-red-600 cursor-pointer">Remove</button>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant">Upload your own logo to replace the Sellri brand.</p>
                        )}
                        <button onClick={() => logoInputRef.current?.click()} className="text-xs text-primary hover:underline mt-1 cursor-pointer">{navbarLogoURL ? "Change" : "Upload"}</button>
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-outline-variant/20 pt-5">
                    <label className="block font-label-md text-sm text-on-surface mb-2">Text Logo (shown when no image logo)</label>
                    <input type="text" value={navbarLogoText} onChange={(e) => setNavbarLogoText(e.target.value)} placeholder="My Store" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm mb-3" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-label-md text-xs text-on-surface mb-1">Font</label>
                        <select value={navbarLogoFont} onChange={(e) => setNavbarLogoFont(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm">
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Impact">Impact</option>
                          <option value="Playfair Display">Playfair Display</option>
                          <option value="Poppins">Poppins</option>
                          <option value="Montserrat">Montserrat</option>
                          <option value="Lobster">Lobster</option>
                          <option value="Pacifico">Pacifico</option>
                          <option value="Dancing Script">Dancing Script</option>
                          <option value="Bebas Neue">Bebas Neue</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-label-md text-xs text-on-surface mb-1">Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={navbarLogoTextColor} onChange={(e) => setNavbarLogoTextColor(e.target.value)} className="w-12 h-12 rounded-xl border border-outline cursor-pointer bg-transparent p-1 shrink-0" />
                          <input type="text" value={navbarLogoTextColor} onChange={(e) => setNavbarLogoTextColor(e.target.value)} className="flex-1 px-3 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-2">Logo position</label>
                    <div className="flex gap-3">
                      {(["left", "center", "right"] as const).map((pos) => (
                        <button key={pos} onClick={() => setLogoPosition(pos)} className={`flex-1 py-3 rounded-xl text-sm font-label-md transition-all cursor-pointer capitalize ${logoPosition === pos ? "text-white" : "border border-outline text-on-surface-variant hover:text-on-surface"}`} style={logoPosition === pos ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}>{pos}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-2">Logo size: {navbarLogoHeight}px</label>
                    <input type="range" min="20" max="120" value={navbarLogoHeight} onChange={(e) => setNavbarLogoHeight(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: "var(--color-primary, #ff6b35)" }} />
                    <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                      <span>20px</span>
                      <span>120px</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-2">Background Colour</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={navbarBgColor} onChange={(e) => setNavbarBgColor(e.target.value)} className="w-12 h-12 rounded-xl border border-outline cursor-pointer bg-transparent p-1" />
                      <input type="text" value={navbarBgColor} onChange={(e) => setNavbarBgColor(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" placeholder="#f68f1d" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-2">Background Image (optional)</label>
                    <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${bgUploading ? "opacity-60 pointer-events-none" : "hover:border-primary"} ${navbarBgImage ? "border-primary" : "border-outline-variant"}`} onClick={() => bgInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#ff6b35"; }} onDragLeave={(e) => { e.currentTarget.style.borderColor = navbarBgImage ? "#ff6b35" : ""; }} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) { const input = bgInputRef.current; if (input) { const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; handleBgUpload({ target: input } as any); } } }}>
                      {bgUploading ? (
                        <p className="text-sm text-on-surface-variant">Uploading...</p>
                      ) : navbarBgImage ? (
                        <div className="flex items-center gap-3 justify-center">
                          <img src={navbarBgImage} alt="Bg" className="h-12 rounded-lg object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); setNavbarBgImage(""); }} className="text-xs text-red-500 hover:text-red-600 font-label-md cursor-pointer">Remove</button>
                        </div>
                      ) : (
                        <div>
                          <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-1">cloud_upload</span>
                          <p className="text-sm text-on-surface-variant">Drop an image here or click to upload</p>
                        </div>
                      )}
                      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                    </div>
                  </div>

                  <div className="bg-surface-container-low rounded-xl overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-outline-variant/20">
                      <span className="text-xs font-label-md text-on-surface-variant">Navbar Preview</span>
                    </div>
                    <div className="w-full h-14 flex items-center px-4" style={{
                      backgroundColor: navbarBgImage ? "transparent" : navbarBgColor,
                      backgroundImage: navbarBgImage ? `url(${navbarBgImage})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}>
                      <div className="flex h-full items-center w-full mx-auto" style={{ maxWidth: 1440, justifyContent: logoPosition === "left" ? "flex-start" : logoPosition === "right" ? "flex-end" : "center" }}>
                        {navbarLogoURL ? (
                          <img src={navbarLogoURL} alt="Store" className="object-contain" style={{ height: navbarLogoHeight, maxWidth: 200 }} />
                        ) : navbarLogoText ? (
                          <span style={{ fontFamily: `"${navbarLogoFont}", serif`, color: navbarLogoTextColor, fontSize: navbarLogoHeight, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
                            {navbarLogoText}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {editSection === "products" && (
                <>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Title</label>
                    <input type="text" value={productsTitle} onChange={(e) => setProductsTitle(e.target.value)} placeholder="Our Products" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Subtitle</label>
                    <input type="text" value={productsSubtitle} onChange={(e) => setProductsSubtitle(e.target.value)} placeholder="Browse our collection" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="productsShowFilter" checked={productsShowFilter} onChange={(e) => setProductsShowFilter(e.target.checked)} className="w-5 h-5 rounded border-outline cursor-pointer accent-primary" />
                    <label htmlFor="productsShowFilter" className="font-label-md text-sm text-on-surface cursor-pointer">Show category filter</label>
                  </div>
                </>
              )}

              {editSection === "form" && (
                <>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Title</label>
                    <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Contact Us" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Description</label>
                    <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Have a question? Get in touch!" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Contact Method</label>
                    <div className="flex gap-3">
                      {(["whatsapp", "email"] as const).map((m) => (
                        <button key={m} onClick={() => setFormContactMethod(m)} className={`flex-1 py-3 rounded-xl text-sm font-label-md transition-all cursor-pointer capitalize ${formContactMethod === m ? "text-white" : "border border-outline text-on-surface-variant hover:text-on-surface"}`} style={formContactMethod === m ? { backgroundColor: m === "whatsapp" ? "#25D366" : "var(--color-primary, #ff6b35)" } : {}}>{m}</button>
                      ))}
                    </div>
                  </div>
                  {formContactMethod === "whatsapp" && (
                    <div>
                      <label className="block font-label-md text-sm text-on-surface mb-1">WhatsApp Number</label>
                      <input type="text" value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} placeholder="8669062356" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                    </div>
                  )}
                  {formContactMethod === "email" && (
                    <div>
                      <label className="block font-label-md text-sm text-on-surface mb-1">Recipient Email</label>
                      <input type="email" value={formRecipientEmail} onChange={(e) => setFormRecipientEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                    </div>
                  )}
                  {formContactMethod === "email" && (
                    <div>
                      <label className="block font-label-md text-sm text-on-surface mb-1">Button Label</label>
                      <input type="text" value={formButtonLabel} onChange={(e) => setFormButtonLabel(e.target.value)} placeholder="Send Inquiry" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                    </div>
                  )}
                </>
              )}

              {editSection === "footer" && (
                <>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Store Name</label>
                    <input type="text" value={footerStoreName} onChange={(e) => setFooterStoreName(e.target.value)} placeholder="My Store" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Instagram URL</label>
                    <input type="text" value={footerInstagram} onChange={(e) => setFooterInstagram(e.target.value)} placeholder="https://instagram.com/yourstore" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">WhatsApp Number</label>
                    <input type="text" value={footerWhatsapp} onChange={(e) => setFooterWhatsapp(e.target.value)} placeholder="8669062356" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Facebook URL</label>
                    <input type="text" value={footerFacebook} onChange={(e) => setFooterFacebook(e.target.value)} placeholder="https://facebook.com/yourstore" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                  <div className="border-t border-outline-variant/20 pt-4">
                    <p className="font-label-md text-sm text-on-surface mb-3">Contact Info</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block font-label-md text-xs text-on-surface mb-1">Phone</label>
                        <input type="text" value={footerPhone} onChange={(e) => setFooterPhone(e.target.value)} placeholder="+918669062356" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                      </div>
                      <div>
                        <label className="block font-label-md text-xs text-on-surface mb-1">Email</label>
                        <input type="email" value={footerEmail} onChange={(e) => setFooterEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                      </div>
                      <div>
                        <label className="block font-label-md text-xs text-on-surface mb-1">Location / Address</label>
                        <input type="text" value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} placeholder="123 Main St, City" className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-md text-sm text-on-surface mb-1">Copyright Text</label>
                    <input type="text" value={footerCopyright} onChange={(e) => setFooterCopyright(e.target.value)} placeholder="© 2024 My Store. All rights reserved." className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md text-sm" />
                  </div>
                </>
              )}

              {editSection === "policies" && (
                <>
                  <p className="text-sm text-on-surface-variant mb-4">Edit the content for each policy page.</p>
                  {(["terms", "privacy", "refunds"] as const).map((type) => {
                    const content = type === "terms" ? policyTermsContent : type === "privacy" ? policyPrivacyContent : policyRefundsContent;
                    const setter = type === "terms" ? setPolicyTermsContent : type === "privacy" ? setPolicyPrivacyContent : setPolicyRefundsContent;
                    const filledDefault = type === "terms"
                      ? fillPolicyTemplate(POLICY_DEFAULTS.terms, sellerName, sellerWhatsapp ? `+91 ${sellerWhatsapp}` : "", sellerWhatsapp)
                      : type === "privacy"
                      ? fillPolicyTemplate(POLICY_DEFAULTS.privacy, sellerName, sellerWhatsapp ? `+91 ${sellerWhatsapp}` : "", sellerWhatsapp)
                      : fillPolicyTemplate(POLICY_DEFAULTS.refunds, sellerName, sellerWhatsapp ? `+91 ${sellerWhatsapp}` : "", sellerWhatsapp);
                    return (
                      <div key={type} className="border border-outline-variant/20 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant/20">
                          <p className="font-label-md text-sm text-on-surface font-semibold">{POLICY_LABELS[type]}</p>
                          <button
                            onClick={() => setter("")}
                            className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer font-label-md"
                          >
                            Reset to default
                          </button>
                        </div>
                        <textarea
                          value={content || filledDefault}
                          onChange={(e) => setter(e.target.value)}
                          className="w-full h-[300px] p-4 font-mono text-sm text-on-surface bg-white resize-none border-none outline-none leading-relaxed overflow-y-auto"
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20 shrink-0">
              <button onClick={() => setEditSection(null)} className="py-2.5 px-5 rounded-xl font-label-md text-sm border border-outline text-on-surface-variant hover:text-on-surface transition-all cursor-pointer">Cancel</button>
              <button onClick={() => setEditSection(null)} className="py-2.5 px-5 rounded-xl font-label-md text-sm text-white hover:opacity-90 transition-all cursor-pointer" style={{ backgroundColor: "var(--color-primary, #ff6b35)" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Preview ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden mt-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <h2 className="font-headline-md text-lg text-on-surface">Preview</h2>
          <span className="text-xs text-on-surface-variant font-label-md">Rough preview — exact view may differ. <a href={`/store/${storeSlug}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">View live store</a></span>
        </div>
        <div className="flex flex-col" style={{
          minHeight: 200,
          ...(pageBgType === "color" ? { backgroundColor: pageBgColor } : {}),
          ...(pageBgType === "gradient" ? { background: pageBgGradient } : {}),
          ...(pageBgType === "image" && pageBgImage ? { backgroundImage: `url(${pageBgImage})`, backgroundSize: "100% auto", backgroundRepeat: "repeat-y" } : {}),
        }}>
          {/* Preview Navbar (full width, outside container) */}
          <div className="w-full h-14 flex items-center px-4" style={{
            backgroundColor: navbarBgImage ? "transparent" : navbarBgColor,
            backgroundImage: navbarBgImage ? `url(${navbarBgImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}>
            <div className="flex h-full items-center w-full mx-auto" style={{ maxWidth: 1440, justifyContent: logoPosition === "left" ? "flex-start" : logoPosition === "right" ? "flex-end" : "center" }}>
              {navbarLogoURL ? (
                <img src={navbarLogoURL} alt="Store" className="object-contain" style={{ height: navbarLogoHeight, maxWidth: 200 }} />
              ) : navbarLogoText ? (
                <span style={{ fontFamily: `"${navbarLogoFont}", serif`, color: navbarLogoTextColor, fontSize: navbarLogoHeight, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
                  {navbarLogoText}
                </span>
              ) : null}
            </div>
          </div>

          {/* Sections container (capped at 1200px) */}
          <div className="w-full mx-auto" style={{ maxWidth: 1200 }}>
            <div style={{ "--color-primary": primaryColor } as React.CSSProperties}>
              {/* Preview Products Section */}
              <ProductsSection
                sellerId={user?.uid || ""}
                whatsapp=""
                orderMethod="whatsapp"
                title={productsTitle}
                subtitle={productsSubtitle}
                showCategoryFilter={productsShowFilter}
                onAddToCart={() => {}}
                bgColor={productsBgColor}
                bgGradient={productsBgGradient}
                bgImage={productsBgImage}
              />

              {/* Preview Form Section */}
              <div className="border-t border-outline-variant/10" />
              <FormSection
                title={formTitle}
                description={formDescription}
                contactMethod={formContactMethod}
                whatsapp={formWhatsapp}
                showWhatsappContact={formShowWhatsappContact}
                recipientEmail={formRecipientEmail}
                buttonLabel={formButtonLabel}
                phone={formPhone}
                email={formEmail}
                address={formAddress}
                bgColor={formBgColor}
                bgGradient={formBgGradient}
                bgImage={formBgImage}
                primaryColor={primaryColor}
              />

              {/* Preview Footer Section */}
              <div className="border-t border-outline-variant/10" />
              <FooterSection
                storeName={footerStoreName}
                logo={footerLogo}
                instagram={footerInstagram}
                whatsapp={footerWhatsapp}
                facebook={footerFacebook}
                copyright={footerCopyright}
                bgColor={footerBgColor}
                bgGradient={footerBgGradient}
                bgImage={footerBgImage}
                termsUrl={storeSlug ? `/store/${storeSlug}/policy/terms` : ""}
                privacyUrl={storeSlug ? `/store/${storeSlug}/policy/privacy` : ""}
                refundsUrl={storeSlug ? `/store/${storeSlug}/policy/refunds` : ""}
                phone={footerPhone}
                email={footerEmail}
                address={footerAddress}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 py-3 px-6 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          style={{ backgroundColor: "var(--color-primary, #ff6b35)", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </>
  );
}
