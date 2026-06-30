"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [showMobileSort, setShowMobileSort] = useState(false);

  useLockBody(!!selectedProduct);

  const sortLabels: Record<SortMode, string> = {
    newest: "Newest",
    "price-asc": "Price ↑",
    "price-desc": "Price ↓",
    "name-asc": "A → Z",
    "name-desc": "Z → A",
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        {title && (
          <h1 className="font-display-lg text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface mb-2 sm:mb-3 text-center tracking-tight">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-on-surface-variant text-sm sm:text-base md:text-lg text-center mb-6 sm:mb-10 px-2">
            {subtitle}
          </p>
        )}

        {/* Full-width search bar */}
        <div className="relative mb-5 sm:mb-10">
          <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 material-symbols-outlined" style={{ fontSize: 20 }}>
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="What are you looking for?"
            className="w-full h-12 sm:h-14 pl-12 sm:pl-14 pr-4 sm:pr-5 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white text-sm sm:text-base text-on-surface placeholder:text-on-surface-variant/40 outline-none"
          />
        </div>

        {/* Mobile toolbar */}
        <div className="relative md:hidden flex items-center gap-2 mb-4 z-30">
          {showCategoryFilter && categories.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowMobileFilter((v) => !v); setShowMobileSort(false); }}
              className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border border-outline bg-white text-sm font-medium text-on-surface active:bg-surface-container-low transition-all cursor-pointer flex-1"
            >
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>filter_list</span>
              <span className="truncate">{activeCat || "All Categories"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => { setShowMobileSort((v) => !v); setShowMobileFilter(false); }}
            className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl border border-outline bg-white text-sm font-medium text-on-surface active:bg-surface-container-low transition-all cursor-pointer flex-1"
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>sort</span>
            {sortLabels[sort]}
          </button>

          {/* Mobile filter dropdown — absolutely positioned so it overlays instead of pushing the page down */}
          {showMobileFilter && showCategoryFilter && categories.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 p-3 rounded-xl border border-outline bg-white shadow-lg z-30">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveCat(""); setShowMobileFilter(false); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    !activeCat
                      ? "text-white shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant border border-outline-variant/30"
                  }`}
                  style={!activeCat ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => { setActiveCat(cat); setShowMobileFilter(false); }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      activeCat === cat
                        ? "text-white shadow-sm"
                        : "bg-surface-container-low text-on-surface-variant border border-outline-variant/30"
                    }`}
                    style={activeCat === cat ? { backgroundColor: "var(--color-primary, #ff6b35)" } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile sort dropdown — absolutely positioned so it overlays instead of pushing the page down */}
          {showMobileSort && (
            <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-xl border border-outline bg-white shadow-lg z-30">
              {(Object.entries(sortLabels) as [SortMode, string][]).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => { setSort(value); setShowMobileSort(false); }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all cursor-pointer ${
                    sort === value
                      ? "font-bold text-on-surface bg-surface-container-low"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Invisible backdrop so a tap outside either dropdown closes it instead of landing on whatever sits beneath */}
        {(showMobileFilter || showMobileSort) && (
          <div
            className="fixed inset-0 z-20 md:hidden"
            onClick={() => { setShowMobileFilter(false); setShowMobileSort(false); }}
          />
        )}

        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Desktop sidebar */}
          {showCategoryFilter && categories.length > 0 && (
            <div className="hidden md:block w-56 shrink-0">
              <p className="font-display-sm text-lg font-bold text-on-surface mb-2">Categories</p>
              <div className="w-10 h-0.5 bg-on-surface mb-5" />
              <div className="space-y-1">
                <button
                  type="button"
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
                    type="button"
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
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Sort + count row */}
            <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-6 gap-2">
              <div className="hidden md:flex items-center gap-3">
                <label htmlFor="sort-select" className="text-sm text-on-surface-variant cursor-pointer">Sort by:</label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="relative z-10 h-10 px-3 pr-8 rounded-lg border border-outline bg-white text-sm font-label-md text-on-surface cursor-pointer focus:border-primary-container focus:outline-none"
                >
                  <option value="newest">Relevance</option>
                  <option value="price-asc">Price ↑</option>
                  <option value="price-desc">Price ↓</option>
                  <option value="name-asc">A → Z</option>
                  <option value="name-desc">Z → A</option>
                </select>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant whitespace-nowrap">
                {filtered.length} {filtered.length === 1 ? "product" : "products"}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 mb-4" style={{ fontSize: 56 }}>inventory_2</span>
                <p className="text-on-surface-variant text-sm">No products found</p>
              </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  {filtered.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => {
                        const urls = p.photoURLs?.length ? p.photoURLs : p.photoURL ? [p.photoURL] : [];
                        urls.forEach((url) => { const img = new Image(); img.src = url; });
                        setSelectedProduct(p);
                      }}
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
  const allPhotos = product.photoURLs?.length ? product.photoURLs : product.photoURL ? [product.photoURL] : [];
  const [photoIndex, setPhotoIndex] = useState(0);

  const whatsappMsg = `Hi, I'm interested in ${product.name} (₹${product.price})`;
  const whatsappUrl = `https://wa.me/91${whatsapp}?text=${encodeURIComponent(whatsappMsg)}`;
  const askWhatsappUrl = `https://wa.me/91${whatsapp}?text=${encodeURIComponent(`Hi, I have a question about ${product.name} (₹${product.price})`)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="bg-white sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl overflow-y-auto sm:overflow-hidden shadow-2xl relative md:flex animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-all cursor-pointer shadow-lg"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
        </button>

        <div className="h-72 sm:h-96 md:aspect-auto md:w-1/2 md:h-[32rem] shrink-0 bg-surface-container-low relative overflow-hidden">
          {allPhotos.length > 0 ? (
            <>
              <img src={allPhotos[photoIndex]} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              {allPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex - 1 + allPhotos.length) % allPhotos.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 22 }}>chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex + 1) % allPhotos.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 22 }}>chevron_right</span>
                  </button>
                  <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                    {allPhotos.map((_, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                        className={`rounded-full transition-all cursor-pointer ${i === photoIndex ? "w-7 h-2.5 bg-white shadow-md" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/70"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant/15">
              <span className="material-symbols-outlined" style={{ fontSize: 80 }}>image</span>
            </div>
          )}
        </div>

        <div className="md:w-1/2 p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between md:overflow-y-auto">
          <div>
            <h2 className="font-headline-md text-xl sm:text-2xl md:text-3xl lg:text-4xl text-on-surface font-bold leading-tight">{product.name}</h2>

            <div className="flex items-baseline gap-2 mt-3 sm:mt-4">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ color: "var(--color-primary, #ff6b35)" }}>
                ₹{product.price.toLocaleString("en-IN")}
              </span>
            </div>

            {product.category && (
              <div className="mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-surface-container-low text-on-surface-variant border border-outline-variant/20">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>folder</span>
                  {product.category}
                </span>
              </div>
            )}

            {product.description && (
              <div className="mt-5 sm:mt-6">
                <div className="w-10 h-0.5 rounded-full bg-outline-variant/30 mb-3 sm:mb-4" />
                <p className="text-on-surface-variant text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-6 sm:pt-8 md:pt-10">
            {orderMethod === "whatsapp" ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 md:py-5 rounded-2xl font-label-md text-base sm:text-lg text-white hover:brightness-110 active:scale-[0.97] transition-all shadow-lg hover:shadow-xl"
                style={{ backgroundColor: "#25D366" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>chat</span>
                Order on WhatsApp
              </a>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { onAddToCart?.(product); onClose(); }}
                  className="w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 md:py-5 rounded-2xl font-label-md text-base sm:text-lg text-white hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: "var(--color-primary, #ff6b35)" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add_shopping_cart</span>
                  Add to Cart
                </button>
                {whatsapp && (
                  <a
                    href={askWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-3 sm:py-3.5 md:py-4 rounded-2xl font-label-md text-sm sm:text-base hover:brightness-110 active:scale-[0.97] transition-all border"
                    style={{ color: "#25D366", borderColor: "#25D366" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#25D366" }}>chat</span>
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
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  // Preload thumbnail when card enters viewport (carousel images only when tapped)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (product.photoURL) { const img = new Image(); img.src = product.photoURL; }
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product.photoURL]);

  return (
    <div ref={cardRef} className="flex flex-col group cursor-pointer" onClick={() => onSelect(product)}>
      <div className="aspect-square bg-gradient-to-br from-surface-container-low to-surface overflow-hidden rounded-xl relative">
        {product.photoURL ? (
          <img
            ref={imgRef}
            src={product.photoURL}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
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
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[10px] sm:text-[11px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>collections</span>
            {product.photoURLs.length}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 sm:gap-1 pt-2 sm:pt-3">
        <h3 className="font-label-md font-medium text-on-surface text-sm sm:text-base md:text-lg leading-snug line-clamp-1">
          {product.name}
        </h3>
        <span className="font-label-md font-semibold text-on-surface text-sm sm:text-base tracking-tight">
          ₹{product.price.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}