"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLockBody } from "@/hooks/useLockBody";

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  photoURL: string;
  photoURLs?: string[];
  inStock: boolean;
  category: string;
};

type ProductsSectionProps = {
  sellerId: string;
  products?: Product[];
  whatsapp: string;
  orderMethod: "whatsapp" | "razorpay";
  title: string;
  subtitle?: string;
  showCategoryFilter?: boolean;
  onAddToCart?: (product: Product) => void;
  bgColor?: string;
  bgGradient?: string;
  bgImage?: string;
};

type SortMode = "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

export default function ProductsSection({
  sellerId,
  products: initialProducts,
  whatsapp,
  orderMethod,
  title,
  subtitle,
  showCategoryFilter,
  onAddToCart,
  bgColor = "",
  bgGradient = "",
  bgImage = "",
}: ProductsSectionProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [activeCat, setActiveCat] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useLockBody(!!selectedProduct || sidebarOpen);

  useEffect(() => {
    if (initialProducts) { setProducts(initialProducts); return; }
    const q = query(
      collection(db, "users", sellerId, "products"),
      orderBy("createdAt", "desc")
    );
    getDocs(q).then((snap) => {
      const list: Product[] = [];
      snap.forEach((d) => {
        const p = d.data() as any;
        if (p.inStock !== false) list.push({ id: d.id, ...p });
      });
      setProducts(list);
    });
  }, [sellerId, initialProducts]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(() => {
    let result = activeCat ? products.filter((p) => p.category === activeCat) : [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }

    return result;
  }, [products, activeCat, search, sort]);

  return (
    <>
    <div
      className="w-full"
      style={
        bgGradient
          ? { background: bgGradient }
          : bgImage
          ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { backgroundColor: bgColor || undefined }
      }
    >
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        {title && (
          <h1 className="font-display-lg text-4xl md:text-5xl font-bold text-on-surface mb-3 text-center tracking-tight">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-on-surface-variant text-base md:text-lg text-center mb-10">
            {subtitle}
          </p>
        )}

        {/* Full-width search bar */}
        <div className="relative mb-10">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 material-symbols-outlined" style={{ fontSize: 20 }}>
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="What are you looking for?"
            className="w-full h-14 pl-14 pr-5 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white text-base text-on-surface placeholder:text-on-surface-variant/40 outline-none"
          />
        </div>

        <div className="flex gap-10">
          {/* Sidebar */}
          {showCategoryFilter && categories.length > 0 && (
            <>
              {/* Mobile toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border border-outline text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer mb-4"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>filter_list</span>
              </button>

              {/* Desktop sidebar */}
              <div className="hidden md:block w-56 shrink-0">
                  <p className="font-display-sm text-lg font-bold text-on-surface mb-2">Categories</p>
                  <div className="w-10 h-0.5 bg-on-surface mb-5" />
                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveCat("")}
                      className={`w-full text-left px-1 py-2 text-sm transition-all cursor-pointer ${
                        !activeCat
                          ? "font-bold text-on-surface"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      All Products
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCat(cat)}
                        className={`w-full text-left px-1 py-2 text-sm transition-all cursor-pointer ${
                          activeCat === cat
                            ? "font-bold text-on-surface"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
              </div>

              {/* Mobile sidebar overlay */}
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-50 md:hidden"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-5 flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-sm font-semibold text-on-surface tracking-wide">Categories</p>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors"
                      >
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => { setActiveCat(""); setSidebarOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-label-md transition-all cursor-pointer ${
                          !activeCat ? "text-white" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                        }`}
                        style={!activeCat ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}
                      >
                        All Products
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => { setActiveCat(cat); setSidebarOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-label-md transition-all cursor-pointer ${
                            activeCat === cat ? "text-white" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                          }`}
                          style={activeCat === cat ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Sort + count row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <label htmlFor="sort-select" className="text-sm text-on-surface-variant cursor-pointer">Sort by:</label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="h-10 px-3 pr-8 rounded-lg border border-outline bg-white text-sm font-label-md text-on-surface cursor-pointer focus:border-primary-container focus:outline-none"
                >
                  <option value="newest">Relevance</option>
                  <option value="price-asc">Price ↑</option>
                  <option value="price-desc">Price ↓</option>
                  <option value="name-asc">A → Z</option>
                  <option value="name-desc">Z → A</option>
                </select>
              </div>
              <p className="text-sm text-on-surface-variant">
                {filtered.length} {filtered.length === 1 ? "product" : "products"}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 mb-4" style={{ fontSize: 56 }}>inventory_2</span>
                <p className="text-on-surface-variant text-sm">No products found</p>
              </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {filtered.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
          whatsapp={whatsapp}
          orderMethod={orderMethod}
        />
      )}
    </>
  );
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  whatsapp,
  orderMethod,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  whatsapp: string;
  orderMethod: "whatsapp" | "razorpay";
}) {
  useLockBody(true);

  const allPhotos = product.photoURLs?.length ? product.photoURLs : product.photoURL ? [product.photoURL] : [];
  const [photoIndex, setPhotoIndex] = useState(0);

  const whatsappMsg = `Hi, I'm interested in ${product.name} (₹${product.price})`;
  const whatsappUrl = `https://wa.me/91${whatsapp}?text=${encodeURIComponent(whatsappMsg)}`;
  const askWhatsappUrl = `https://wa.me/91${whatsapp}?text=${encodeURIComponent(`Hi, I have a question about ${product.name} (₹${product.price})`)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md md:max-w-3xl overflow-hidden shadow-xl md:shadow-2xl relative md:flex"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
        </button>

        <div className="aspect-square md:aspect-auto md:w-1/2 md:min-h-96 bg-gradient-to-br from-surface-container-low to-surface relative">
          {allPhotos.length > 0 ? (
            <>
              <img src={allPhotos[photoIndex]} alt={product.name} className="w-full h-full object-cover" />
              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex - 1 + allPhotos.length) % allPhotos.length); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 18 }}>chevron_left</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex + 1) % allPhotos.length); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 18 }}>chevron_right</span>
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allPhotos.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? "bg-white scale-125" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant/15">
              <span className="material-symbols-outlined" style={{ fontSize: 64 }}>image</span>
            </div>
          )}
        </div>

        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
          <div>
            <h2 className="font-headline-md text-xl md:text-2xl text-on-surface font-medium leading-snug">{product.name}</h2>
            <p className="font-label-md font-semibold text-primary text-2xl md:text-3xl mt-1 md:mt-2">
              ₹{product.price.toLocaleString("en-IN")}
            </p>
          </div>

          {product.description && (
            <div className="mt-4 md:mt-5">
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">{product.description}</p>
            </div>
          )}

          <div className="space-y-3 pt-5 md:pt-7">
            {orderMethod === "whatsapp" ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
                style={{ backgroundColor: "#25D366" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>
                Order on WhatsApp
              </a>
            ) : (
              <>
                <button
                  onClick={() => { onAddToCart?.(product); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                  style={{ backgroundColor: "var(--color-primary, #ff6b35)" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_shopping_cart</span>
                  Add to Cart
                </button>
                {whatsapp && (
                  <a
                    href={askWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl font-label-md text-on-surface-variant border border-outline hover:bg-surface-container-low active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help</span>
                    Ask about this product
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  return (
    <div className="flex flex-col group cursor-pointer" onClick={() => onSelect(product)}>
      <div className="aspect-square bg-gradient-to-br from-surface-container-low to-surface overflow-hidden rounded-xl relative">
        {product.photoURL ? (
          <img
            src={product.photoURL}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/15">
            <span className="material-symbols-outlined" style={{ fontSize: 56 }}>image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center rounded-xl">
          <span className="text-white text-sm font-semibold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            Product details
          </span>
        </div>
        {product.photoURLs && product.photoURLs.length > 1 && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[11px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>collections</span>
            {product.photoURLs.length}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-3">
        <h3 className="font-label-md font-medium text-on-surface text-lg leading-snug line-clamp-1">
          {product.name}
        </h3>
        <span className="font-label-md font-semibold text-on-surface text-base tracking-tight">
          ₹{product.price.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}
