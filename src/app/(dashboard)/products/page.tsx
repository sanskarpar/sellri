"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, getDocs, getDoc, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import ConfirmModal from "@/components/ConfirmModal";
import { useLockBody } from "@/hooks/useLockBody";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  photoURL: string;
  photoURLs?: string[];
  inStock: boolean;
  category: string;
  createdAt?: any;
  slug?: string;
  sizes?: { name: string; price?: number }[];
  colors?: { name: string; hex?: string }[];
};

type Category = string;

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; name: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [makeToOrder, setMakeToOrder] = useState(false);

  useLockBody(showForm || !!deleteTarget);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPhotoFiles, setFormPhotoFiles] = useState<(File | null)[]>([null, null, null]);
  const [formPhotoPreviews, setFormPhotoPreviews] = useState<string[]>(["", "", ""]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [formInStock, setFormInStock] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [formSizes, setFormSizes] = useState<{ name: string; price?: number }[]>([]);
  const [formColors, setFormColors] = useState<{ name: string; hex?: string }[]>([]);

  const [sellerSlug, setSellerSlug] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  function generateProductSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "product";
  }

  async function ensureUniqueSlug(base: string, existingId?: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (products.some((p) => p.slug === slug && p.id !== existingId)) {
      slug = `${base}-${i}`;
      i++;
    }
    return slug;
  }

  useEffect(() => {
    const stored = localStorage.getItem("sellri_user");
    if (!stored) { router.push("/signin"); return; }
    const u = JSON.parse(stored);
    setUser(u);
    loadProducts(u.uid);
    getDoc(doc(db, "users", u.uid)).then(async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.makeToOrder) setMakeToOrder(true);
        if (data?.slug) {
          setSellerSlug(data.slug);
        } else if (data?.name) {
          const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "store";
          setSellerSlug(slug);
          await updateDoc(doc(db, "users", u.uid), { slug });
        }
      }
    });
  }, [router]);

  async function loadProducts(uid: string) {
    setLoading(true);
    const q = query(collection(db, "users", uid, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const list: Product[] = [];
    const cats = new Set<Category>();
    const slugUpdates: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      if (!data.slug) {
        data.slug = generateProductSlug(data.name || "product");
        let i = 1;
        while (list.some((p) => p.slug === data.slug)) {
          data.slug = `${generateProductSlug(data.name || "product")}-${i}`;
          i++;
        }
        slugUpdates.push(updateDoc(doc(db, "users", uid, "products", d.id), { slug: data.slug }));
      }
      list.push({ id: d.id, ...data });
      if (data.category) cats.add(data.category);
    });
    if (slugUpdates.length > 0) await Promise.all(slugUpdates);
    setProducts(list);
    setCategories(Array.from(cats).sort());
    setLoading(false);
  }

  function resetForm() {
    setFormName("");
    setFormPrice("");
    setFormDescription("");
    setFormCategory("");
    setFormPhotoFiles([null, null, null]);
    formPhotoPreviews.forEach((p) => { if (p.startsWith("blob:")) URL.revokeObjectURL(p); });
    setFormPhotoPreviews(["", "", ""]);
    setFormInStock(true);
    setNewCategory("");
    setFormSizes([]);
    setFormColors([]);
    setEditingProduct(null);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormPrice(String(product.price));
    setFormDescription(product.description);
    setFormCategory(product.category);
    setFormInStock(product.inStock);
    setFormSizes(product.sizes ? JSON.parse(JSON.stringify(product.sizes)) : []);
    setFormColors(product.colors ? JSON.parse(JSON.stringify(product.colors)) : []);
    const existing = product.photoURLs?.length ? product.photoURLs : product.photoURL ? [product.photoURL] : [];
    setFormPhotoPreviews([existing[0] || "", existing[1] || "", existing[2] || ""]);
    setFormPhotoFiles([null, null, null]);
    setShowForm(true);
  }

  async function handleSave() {
    if (!user || !formName || !formPrice) return;
    setSaving(true);
    try {
      const category = newCategory.trim() || formCategory;

      const uploadIndices: number[] = [];
      const uploadPromises: Promise<string>[] = [];
      for (let i = 0; i < 3; i++) {
        const file = formPhotoFiles[i];
        if (file) {
          const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${file.name}`);
          uploadIndices.push(i);
          uploadPromises.push(
            uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef))
          );
        }
      }
      const uploadedURLs = await Promise.all(uploadPromises);

      const photoURLs: string[] = [];
      for (let i = 0; i < 3; i++) {
        if (formPhotoPreviews[i]) {
          const uploadIdx = uploadIndices.indexOf(i);
          if (uploadIdx !== -1) {
            photoURLs.push(uploadedURLs[uploadIdx]);
          } else {
            photoURLs.push(formPhotoPreviews[i]);
          }
        }
      }

      const slug = editingProduct?.slug || await ensureUniqueSlug(generateProductSlug(formName.trim()));

      const data: Record<string, any> = {
        name: formName.trim(),
        price: parseFloat(formPrice),
        description: formDescription.trim(),
        category,
        photoURL: photoURLs[0] || "",
        photoURLs,
      inStock: makeToOrder ? true : formInStock,
      slug,
      sizes: formSizes.length > 0 ? formSizes.map((s) => ({ name: s.name, ...(s.price ? { price: s.price } : {}) })) : [],
      colors: formColors.length > 0 ? formColors.map((c) => ({ name: c.name, ...(c.hex ? { hex: c.hex } : {}) })) : [],
      updatedAt: serverTimestamp(),
    };
      if (editingProduct) {
        await updateDoc(doc(db, "users", user.uid, "products", editingProduct.id), data);
      } else {
        data.sellerId = user.uid;
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "users", user.uid, "products"), data);
      }
      await loadProducts(user.uid);
      setShowForm(false);
      resetForm();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStock(product: Product) {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "products", product.id), {
      inStock: !product.inStock,
      updatedAt: serverTimestamp(),
    });
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, inStock: !p.inStock } : p));
  }

  async function handleConfirmDelete() {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "products", deleteTarget.id));
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = filterCategory ? products.filter((p) => p.category === filterCategory) : products;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-on-surface-variant">Loading...</p></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display-lg text-3xl text-on-surface">Products</h1>
          <p className="text-on-surface-variant">{products.length} product{products.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 py-3 px-6 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Product
        </button>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterCategory("")}
            className={`px-4 py-2 rounded-xl text-sm font-label-md transition-all cursor-pointer ${!filterCategory ? "text-white" : "text-on-surface-variant border border-outline hover:text-on-surface"}`}
            style={!filterCategory ? { backgroundColor: "#ff6b35" } : {}}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-label-md transition-all cursor-pointer ${filterCategory === cat ? "text-white" : "text-on-surface-variant border border-outline hover:text-on-surface"}`}
              style={filterCategory === cat ? { backgroundColor: "#ff6b35" } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4">inventory_2</span>
          <h2 className="font-headline-md text-xl text-on-surface mb-2">No products yet</h2>
          <p className="text-on-surface-variant mb-6">Add your first product to start selling.</p>
          <button
            onClick={openAddForm}
            className="py-3 px-8 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
          >
            Add Product
          </button>
        </div>
      ) : (
        /* Product grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden group">
              {/* Photo */}
              <div className="aspect-[4/3] bg-surface-container-low relative overflow-hidden">
                {product.photoURL ? (
                  <img src={product.photoURL} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                    <span className="material-symbols-outlined text-5xl">image</span>
                  </div>
                )}
                {product.photoURLs && product.photoURLs.length > 1 && (
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[11px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>collections</span>
                    {product.photoURLs.length}
                  </div>
                )}
                {/* Stock badge */}
                {!makeToOrder && (
                  <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold ${product.inStock ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                    {product.inStock ? "In Stock" : "Out of Stock"}
                  </div>
                )}
                {/* Actions overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => openEditForm(product)}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 18 }}>edit</span>
                  </button>
                  {sellerSlug && product.slug && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(`${window.location.origin}/store/${sellerSlug}?product=${product.slug}`);
                          const btn = e.currentTarget;
                          btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">check</span>';
                          setTimeout(() => {
                            btn.innerHTML = '<span class="material-symbols-outlined text-on-surface" style="font-size:18px">link</span>';
                          }, 2000);
                        } catch { /* fallback */ }
                      }}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      title="Copy product link"
                    >
                      <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 18 }}>link</span>
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(product)}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>delete</span>
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-label-md font-bold text-on-surface">{product.name}</h3>
                  <span className="font-label-md font-bold text-primary">₹{product.price}</span>
                </div>
                {product.description && (
                  <p className="text-sm text-on-surface-variant line-clamp-2 mb-2">{product.description}</p>
                )}
                {product.category && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-surface-container-low text-on-surface-variant">
                    {product.category}
                  </span>
                )}
                {!makeToOrder && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant">Active</span>
                    <button
                      type="button"
                      onClick={() => handleToggleStock(product)}
                      className={`w-10 h-6 rounded-full transition-all cursor-pointer relative ${product.inStock ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                        style={{ transform: product.inStock ? "translateX(18px)" : "translateX(2px)" }}
                      />
                    </button>
                  </div>
                )}
              </div>
              {/* Mobile: always-visible actions */}
              <div className="md:hidden flex items-center gap-2 px-4 pb-4 pt-0">
                <button
                  onClick={() => openEditForm(product)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label-md text-on-surface hover:bg-black/5 transition-colors cursor-pointer"
                >
                  Edit
                </button>
                {sellerSlug && product.slug && (
                  <button
                    onClick={async (e) => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/store/${sellerSlug}?product=${product.slug}`);
                        (e.currentTarget as HTMLElement).textContent = "Copied!";
                        setTimeout(() => { (e.currentTarget as HTMLElement).textContent = "Copy Link"; }, 2000);
                      } catch { /* fallback */ }
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-label-md text-on-surface hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    Copy Link
                  </button>
                )}
                <button
                  onClick={() => setDeleteTarget(product)}
                  className="flex-1 py-2.5 rounded-xl border border-red-200 text-sm font-label-md text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <h2 className="font-headline-md text-lg text-on-surface">{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Photo upload — 3 slots */}
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-2">Photos</label>
                {/* Main image (slot 0) */}
                <div
                  onClick={() => { setActiveSlot(0); fileInputRef.current?.click(); }}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-surface-container-low mb-2"
                >
                  {formPhotoPreviews[0] ? (
                    <img src={formPhotoPreviews[0]} alt="Main" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl block mx-auto">add_a_photo</span>
                      <span className="text-xs mt-1 block">Main image</span>
                    </div>
                  )}
                </div>
                {/* Two smaller slots */}
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map((slot) => (
                    <div
                      key={slot}
                      onClick={() => { setActiveSlot(slot); fileInputRef.current?.click(); }}
                      className="aspect-square rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-surface-container-low"
                    >
                      {formPhotoPreviews[slot] ? (
                        <img src={formPhotoPreviews[slot]} alt={`Photo ${slot}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-2xl block mx-auto">add_a_photo</span>
                          <span className="text-[10px] mt-0.5 block">Photo {slot}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const prev = formPhotoPreviews[activeSlot];
                      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                      setFormPhotoFiles((prev) => {
                        const next = [...prev];
                        next[activeSlot] = file;
                        return next;
                      });
                      setFormPhotoPreviews((prev) => {
                        const next = [...prev];
                        next[activeSlot] = URL.createObjectURL(file);
                        return next;
                      });
                    }
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Product name */}
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Product Name *</label>
                <input
                  type="text" value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="Premium Handloom Saree"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Price (₹) *</label>
                <input
                  type="number" value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="1299"
                  min="0" step="0.01"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Short Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3} maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md resize-none"
                  placeholder="Describe your product..."
                />
                <p className="text-xs text-on-surface-variant mt-1 text-right">{formDescription.length}/500</p>
              </div>

              {/* Category */}
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Category</label>
                {categories.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {categories.map((cat) => (
                      <button
                        key={cat} type="button"
                        onClick={() => { setFormCategory(cat); setNewCategory(""); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-label-md cursor-pointer transition-all ${formCategory === cat && !newCategory ? "text-white" : "border border-outline text-on-surface-variant"}`}
                        style={formCategory === cat && !newCategory ? { backgroundColor: "#ff6b35" } : {}}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text" value={newCategory}
                  onChange={(e) => { setNewCategory(e.target.value); setFormCategory(""); }}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder={categories.length > 0 ? "Or type a new category..." : "e.g. Sarees, Kurtis, Accessories"}
                />
              </div>

              {/* Sizes */}
              <div className="border-t border-outline-variant/20 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-label-md font-semibold text-sm text-on-surface">Sizes (optional)</p>
                  <button
                    type="button"
                    onClick={() => setFormSizes((prev) => [...prev, { name: "", price: undefined }])}
                    className="text-xs font-semibold text-primary hover:opacity-80 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> Add Size
                  </button>
                </div>
                {formSizes.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No sizes added. Customers won't see a size selector.</p>
                ) : (
                  <div className="space-y-2">
                    {formSizes.map((size, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text" value={size.name}
                          onChange={(e) => {
                            const next = [...formSizes];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setFormSizes(next);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white text-sm"
                          placeholder="e.g. Small, Medium, Large"
                        />
                        <input
                          type="number" min="0" value={size.price ?? ""}
                          onChange={(e) => {
                            const next = [...formSizes];
                            next[idx] = { ...next[idx], price: e.target.value ? Number(e.target.value) : undefined };
                            setFormSizes(next);
                          }}
                          className="w-24 px-3 py-2 rounded-lg border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white text-sm"
                          placeholder="Price +₹"
                        />
                        <button
                          type="button"
                          onClick={() => setFormSizes((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="border-t border-outline-variant/20 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-label-md font-semibold text-sm text-on-surface">Colors (optional)</p>
                  <button
                    type="button"
                    onClick={() => setFormColors((prev) => [...prev, { name: "", hex: "" }])}
                    className="text-xs font-semibold text-primary hover:opacity-80 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> Add Color
                  </button>
                </div>
                {formColors.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No colors added. Customers won't see a color selector.</p>
                ) : (
                  <div className="space-y-2">
                    {formColors.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text" value={color.name}
                          onChange={(e) => {
                            const next = [...formColors];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setFormColors(next);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white text-sm"
                          placeholder="e.g. Red, Blue, Green"
                        />
                        <div className="relative">
                          <input
                            type="color" value={color.hex || "#000000"}
                            onChange={(e) => {
                              const next = [...formColors];
                              next[idx] = { ...next[idx], hex: e.target.value };
                              setFormColors(next);
                            }}
                            className="w-10 h-10 rounded-lg border border-outline cursor-pointer bg-white p-0.5"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormColors((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In stock toggle (hidden when makeToOrder) */}
              {!makeToOrder && (
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-sm text-on-surface">In Stock</label>
                  <button
                    type="button"
                    onClick={() => setFormInStock(!formInStock)}
                    className={`w-12 h-7 rounded-full transition-all cursor-pointer relative ${formInStock ? "bg-green-500" : "bg-outline-variant"}`}
                  >
                    <div
                      className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform"
                      style={{ transform: formInStock ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl font-label-md text-on-surface-variant border border-outline hover:text-on-surface transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave} disabled={saving || !formName || !formPrice}
                className="flex-[2] py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
              >
                {saving ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
