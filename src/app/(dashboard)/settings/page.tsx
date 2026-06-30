"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, linkWithCredential } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { useLockBody } from "@/hooks/useLockBody";

// ─── CropModal ────────────────────────────────────────────────────────────────

const CROP_SIZE = 300;
const OUTPUT_SIZE = 400;

function CropModal({
  file,
  onCrop,
  onClose,
}: {
  file: File;
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}) {
  useLockBody(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<number | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !loaded) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.save();
    ctx.translate(CROP_SIZE / 2 + offset.x, CROP_SIZE / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -zoom : zoom, flipV ? -zoom : zoom);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [zoom, rotation, offset, flipH, flipV, loaded]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const scale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
      setZoom(parseFloat(scale.toFixed(2)));
      setLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setOffset((p) => ({
        x: p.x + e.clientX - lastPos.current.x,
        y: p.y + e.clientY - lastPos.current.y,
      }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.touches.length === 2) {
      pinchRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging.current) {
      setOffset((p) => ({
        x: p.x + e.touches[0].clientX - lastPos.current.x,
        y: p.y + e.touches[0].clientY - lastPos.current.y,
      }));
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.touches.length === 2 && pinchRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - pinchRef.current) / 150;
      setZoom((z) => parseFloat(Math.max(0.3, Math.min(5, z + delta)).toFixed(2)));
      pinchRef.current = dist;
    }
  };

  const onTouchEnd = () => { dragging.current = false; pinchRef.current = null; };

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => parseFloat(Math.max(0.3, Math.min(5, z + (e.deltaY < 0 ? 0.08 : -0.08))).toFixed(2)));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const handleReset = () => {
    const img = imgRef.current;
    if (!img) return;
    const scale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    setZoom(parseFloat(scale.toFixed(2)));
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setFlipH(false);
    setFlipV(false);
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const diag = Math.ceil(Math.sqrt(2) * Math.max(img.naturalWidth, img.naturalHeight) * zoom) + CROP_SIZE;

    const tmp = document.createElement("canvas");
    tmp.width = diag;
    tmp.height = diag;
    const tCtx = tmp.getContext("2d")!;
    tCtx.save();
    tCtx.translate(diag / 2 + offset.x, diag / 2 + offset.y);
    tCtx.rotate((rotation * Math.PI) / 180);
    tCtx.scale(flipH ? -zoom : zoom, flipV ? -zoom : zoom);
    tCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    tCtx.restore();

    const srcX = diag / 2 - CROP_SIZE / 2;
    const srcY = diag / 2 - CROP_SIZE / 2;

    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    out.getContext("2d")!.drawImage(tmp, srcX, srcY, CROP_SIZE, CROP_SIZE, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    out.toBlob((b) => { if (b) onCrop(b); }, "image/jpeg", 0.93);
  };

  const rotateStep = (dir: 1 | -1) => {
    setRotation((r) => {
      const next = r + dir * 90;
      return next > 180 ? next - 360 : next < -180 ? next + 360 : next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-hidden w-full"
        style={{
          maxWidth: 380,
          background: "#ffffff",
          boxShadow: "0 32px 64px rgba(0,0,0,0.32)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <span className="font-semibold text-base text-gray-900">Edit logo</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/8 transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div
          className="relative flex items-center justify-center bg-black select-none"
          style={{ width: "100%", aspectRatio: "1 / 1" }}
        >
          <canvas
            ref={canvasRef}
            width={CROP_SIZE}
            height={CROP_SIZE}
            style={{ cursor: "grab", width: "100%", height: "100%", display: "block" }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />

          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            viewBox={`0 0 ${CROP_SIZE} ${CROP_SIZE}`}
            preserveAspectRatio="none"
          >
            <line x1={CROP_SIZE / 3} y1="0" x2={CROP_SIZE / 3} y2={CROP_SIZE} stroke="white" strokeWidth="0.6" opacity="0.3" />
            <line x1={(CROP_SIZE / 3) * 2} y1="0" x2={(CROP_SIZE / 3) * 2} y2={CROP_SIZE} stroke="white" strokeWidth="0.6" opacity="0.3" />
            <line x1="0" y1={CROP_SIZE / 3} x2={CROP_SIZE} y2={CROP_SIZE / 3} stroke="white" strokeWidth="0.6" opacity="0.3" />
            <line x1="0" y1={(CROP_SIZE / 3) * 2} x2={CROP_SIZE} y2={(CROP_SIZE / 3) * 2} stroke="white" strokeWidth="0.6" opacity="0.3" />
            <rect x="0.75" y="0.75" width={CROP_SIZE - 1.5} height={CROP_SIZE - 1.5} fill="none" stroke="white" strokeWidth="1.5" opacity="0.55" />
            <circle cx={CROP_SIZE / 2} cy={CROP_SIZE / 2} r={CROP_SIZE / 2 - 1} fill="none" stroke="white" strokeWidth="0.6" opacity="0.18" strokeDasharray="5 4" />
            {([[0,0],[CROP_SIZE,0],[0,CROP_SIZE],[CROP_SIZE,CROP_SIZE]] as [number,number][]).map(([cx, cy], i) => {
              const dx = cx === 0 ? 1 : -1;
              const dy = cy === 0 ? 1 : -1;
              return (
                <g key={i}>
                  <line x1={cx} y1={cy} x2={cx + dx * 18} y2={cy} stroke="white" strokeWidth="2.5" />
                  <line x1={cx} y1={cy} x2={cx} y2={cy + dy * 18} stroke="white" strokeWidth="2.5" />
                </g>
              );
            })}
          </svg>

          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <span className="material-symbols-outlined text-white/40" style={{ fontSize: 36, animation: "cropSpin 1s linear infinite" }}>
                progress_activity
              </span>
            </div>
          )}
        </div>

        <div className="px-5 pt-4 pb-2 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 17 }}>zoom_out</span>
            <input
              type="range" min="30" max="500" step="1"
              value={Math.round(zoom * 100)}
              onChange={(e) => setZoom(parseInt(e.target.value) / 100)}
              className="flex-1 accent-[#ff6b35]"
            />
            <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 17 }}>zoom_in</span>
            <span className="text-xs text-gray-400 font-medium w-9 text-right">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => rotateStep(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-black/6"
              style={{ border: "1px solid rgba(0,0,0,0.12)" }}
              title="Rotate -90deg"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>rotate_left</span>
            </button>
            <input
              type="range" min="-180" max="180" step="1"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="flex-1 accent-[#ff6b35]"
            />
            <button
              onClick={() => rotateStep(1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-black/6"
              style={{ border: "1px solid rgba(0,0,0,0.12)" }}
              title="Rotate +90deg"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>rotate_right</span>
            </button>
            <span className="text-xs text-gray-400 font-medium w-9 text-right">{rotation}deg</span>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={() => setFlipH((f) => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
              style={{
                border: flipH ? "1px solid transparent" : "1px solid rgba(0,0,0,0.12)",
                background: flipH ? "rgba(255,107,53,0.1)" : "rgba(0,0,0,0.03)",
                color: flipH ? "#ff6b35" : "#555",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>flip</span>
              Flip H
            </button>
            <button
              onClick={() => setFlipV((f) => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
              style={{
                border: flipV ? "1px solid transparent" : "1px solid rgba(0,0,0,0.12)",
                background: flipV ? "rgba(255,107,53,0.1)" : "rgba(0,0,0,0.03)",
                color: flipV ? "#ff6b35" : "#555",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, transform: "rotate(90deg)", display: "inline-block" }}>flip</span>
              Flip V
            </button>
            <div className="flex-1" />
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-black/6"
              style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#555" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>restart_alt</span>
              Reset
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors hover:bg-black/6"
            style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#555" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#ff6b35", boxShadow: "0 4px 14px rgba(255,107,53,0.35)" }}
          >
            Save logo
          </button>
        </div>
      </div>

      <style>{`@keyframes cropSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    || "store";
}

async function slugExists(slug: string, excludeUid: string): Promise<boolean> {
  const q = query(collection(db, "users"), where("slug", "==", slug));
  const snap = await getDocs(q);
  return snap.docs.some((d) => d.id !== excludeUid);
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"store" | "orders">("store");
  const [tab, setTab] = useState<"store" | "orders" | "password">("store");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [hasPasswordAuth, setHasPasswordAuth] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [storeLogo, setStoreLogo] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [orderMethod, setOrderMethod] = useState<"whatsapp" | "razorpay">("whatsapp");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [allowCustomOrders, setAllowCustomOrders] = useState(false);
  const [makeToOrder, setMakeToOrder] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasEmail = !!(user?.email);
  const hasPhone = !!(userDoc?.phone);
  const loggedInViaPhone = !hasEmail;

  useEffect(() => {
    const stored = localStorage.getItem("sellri_user");
    if (!stored) { router.push("/signin"); return; }
    const u = JSON.parse(stored);
    setUser(u);
    const fetchDoc = async () => {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserDoc(data);
        setStoreName(data.name || "");
        setStoreSlug(data.slug || generateSlug(data.name || u.name || "store"));
        setBio(data.bio || "");
        setWhatsapp(data.whatsapp || "");
        setStoreLogo(data.photoURL || "");
        setNewEmail(data.email || u.email || "");
        setNewPhone(data.phone || "");
        setOrderMethod(data.orderMethod || "whatsapp");
        setRazorpayKeyId(data.razorpayKeyId || "");
        setRazorpayKeySecret(data.razorpayKeySecret || "");
        setAllowCustomOrders(data.allowCustomOrders ?? false);
        setMakeToOrder(data.makeToOrder ?? false);
        if (data.onboarded !== true) setIsFirstTime(true);
      }
      const cu = auth.currentUser;
      if (cu) setHasPasswordAuth(cu.providerData?.some((p) => p.providerId === "password") ?? false);
      setLoading(false);
    };
    fetchDoc();
  }, [router]);

  // Auto-generate slug from store name
  useEffect(() => {
    if (!slugManuallyEdited && storeName) {
      setStoreSlug(generateSlug(storeName));
    }
  }, [storeName, slugManuallyEdited]);

  const handlePhotoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) setCropFile(file);
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropFile(file);
      e.target.value = "";
    }
  };

  function handleCropComplete(blob: Blob) {
    const croppedFile = new File([blob], "logo.jpg", { type: "image/jpeg" });
    setLogoFile(croppedFile);
    if (storeLogo.startsWith("blob:")) URL.revokeObjectURL(storeLogo);
    setStoreLogo(URL.createObjectURL(blob));
    setCropFile(null);
  }

  async function uploadPhoto(): Promise<string> {
    if (!logoFile || !user) return storeLogo;
    setLogoUploading(true);
    const storageRef = ref(storage, `profilePhotos/${user.uid}`);
    await uploadBytes(storageRef, logoFile);
    const url = await getDownloadURL(storageRef);
    setLogoUploading(false);
    return url;
  }

  async function handleSaveStore() {
    if (!user) return;
    setError(""); setMessage(""); setSaving(true);
    try {
      // Validate slug
      let slug = storeSlug.trim().toLowerCase();
      if (!slug) slug = generateSlug(storeName || "store");
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        setError("Store URL can only contain lowercase letters, numbers, and hyphens.");
        setSaving(false);
        return;
      }
      if (await slugExists(slug, user.uid)) {
        setError("This store URL is already taken. Please choose another.");
        setSaving(false);
        return;
      }

      let photoURL = storeLogo;
      if (logoFile) photoURL = await uploadPhoto();
      const updates: Record<string, any> = {
        name: storeName,
        slug,
        bio,
        whatsapp,
        photoURL,
        onboarded: true,
        updatedAt: serverTimestamp(),
      };
      if (loggedInViaPhone && newEmail) updates.email = newEmail;
      if (!hasPhone && newPhone) updates.phone = newPhone;
      await updateDoc(doc(db, "users", user.uid), updates);
      localStorage.setItem("sellri_user", JSON.stringify({
        ...user,
        email: loggedInViaPhone ? newEmail : user.email,
        name: storeName,
      }));
      setMessage("Store saved!");
      if (isFirstTime) setStep("orders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOrders() {
    if (!user) return;
    setError(""); setMessage(""); setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        orderMethod,
        allowCustomOrders,
        makeToOrder,
        razorpayKeyId: orderMethod === "razorpay" ? razorpayKeyId : "",
        razorpayKeySecret: orderMethod === "razorpay" ? razorpayKeySecret : "",
        updatedAt: serverTimestamp(),
      });
      setMessage("Order preferences saved!");
      if (isFirstTime) {
        await updateDoc(doc(db, "users", user!.uid), { onboarded: true, updatedAt: serverTimestamp() });
        router.push("/dashboard");
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(""); setPasswordMsg("");
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    if (!newEmail) { setPasswordError("No email address found. Add one in your Store tab."); return; }
    setSaving(true);
    try {
      if (hasPasswordAuth) {
        if (!currentPassword) { setPasswordError("Current password is required"); setSaving(false); return; }
        const credential = EmailAuthProvider.credential(auth.currentUser!.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser!, credential);
        await updatePassword(auth.currentUser!, newPassword);
        setPasswordMsg("Password changed successfully!");
      } else {
        const credential = EmailAuthProvider.credential(newEmail, newPassword);
        await linkWithCredential(auth.currentUser!, credential);
        setPasswordMsg("Password set successfully! You can now sign in with your email.");
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { onboarded: true, updatedAt: serverTimestamp() });
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  const steps = ["store", "orders"] as const;

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6">
      {isFirstTime && (
        <div className="text-center mb-8">
          <h1 className="font-display-lg text-3xl md:text-4xl text-on-surface mb-2">Welcome to Sellri!</h1>
          <p className="text-on-surface-variant">Let&apos;s set up your store in a few steps.</p>
        </div>
      )}

      {isFirstTime && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? "bg-primary text-white" :
                steps.indexOf(step) > i ? "bg-green-500 text-white" : "bg-outline-variant/30 text-on-surface-variant"
              }`}>
                {steps.indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-12 h-0.5 ${steps.indexOf(step) > i ? "bg-green-500" : "bg-outline-variant/30"}`} />}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-label-sm text-red-600 mb-6">{error}</div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-label-sm text-green-600 mb-6">{message}</div>
      )}

      {/* ── Tab Navigation (settings only) ───────────────────────────── */}
      {!isFirstTime && (
        <div className="flex border-b border-outline-variant/30 mb-6">
          {(["store", "orders", "password"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 font-label-md capitalize transition-all cursor-pointer relative ${
                tab === t ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "store" ? "Store" : t === "orders" ? "Orders" : "Password"}
              {tab === t && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#ff6b35" }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Store Card (onboarding step or settings tab) ─────────────── */}
      {(step === "store" && isFirstTime) || (tab === "store" && !isFirstTime) ? (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
          {isFirstTime && <h2 className="font-headline-md text-xl text-on-surface mb-6">Store Details</h2>}

          <div className="md:grid md:grid-cols-2 md:gap-x-8 space-y-5 md:space-y-0">
            {/* Left column - Logo */}
            <div>
              <label className="block font-label-md text-sm text-on-surface mb-2">Store Logo</label>

              <div className="relative w-32 h-32 mx-auto md:mx-0">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handlePhotoDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${
                    dragOver ? "border-primary bg-primary-container/10" : "border-outline-variant hover:border-primary"
                  }`}
                >
                  {storeLogo ? (
                    <img src={storeLogo} alt="Store logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl block mx-auto">store</span>
                      <span className="text-xs mt-1 block">Drop or click</span>
                    </div>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                      <span className="text-white text-sm">Uploading...</span>
                    </div>
                  )}
                </div>

                {storeLogo && !logoUploading && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-white cursor-pointer shadow-md hover:opacity-90 transition-opacity"
                    style={{ background: "#ff6b35" }}
                    title="Change logo"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-center md:text-left text-on-surface-variant mt-3">
                {storeLogo
                  ? "Tap the pencil to swap or re-crop"
                  : "JPG, PNG or WebP . max 10 MB"}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Right column - Fields */}
            <div className="space-y-5">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Store Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="Rahul's Store"
                />
              </div>

              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Store URL</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant shrink-0 whitespace-nowrap">sellri.com/store/</span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                    placeholder="rahuls-store"
                  />
                </div>
                <p className="text-xs text-on-surface-variant mt-1">Auto-generated from your store name. You can customise it.</p>
              </div>

              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">
                  {loggedInViaPhone ? "Email Address" : "Email"}
                </label>
                {loggedInViaPhone ? (
                  <>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                      placeholder="name@example.com"
                    />
                    <p className="text-xs text-on-surface-variant mt-1">Used for order notifications.</p>
                  </>
                ) : (
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-outline bg-surface-container-low text-on-surface-variant font-body-md cursor-not-allowed"
                  />
                )}
              </div>

              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Phone Number</label>
                {hasPhone ? (
                  <input
                    type="tel"
                    value={userDoc?.phone || ""}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-outline bg-surface-container-low text-on-surface-variant font-body-md cursor-not-allowed"
                  />
                ) : (
                  <div>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-outline bg-surface-container-low font-label-md text-on-surface-variant">+91</span>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="w-full px-4 py-3 rounded-r-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                        placeholder="9876543210"
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">Used for order notifications.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row - full width on both columns */}
            <div className="md:col-span-2 space-y-5">
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Store Description</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md resize-none"
                  placeholder="Tell your customers what you sell..."
                />
                <p className="text-xs text-on-surface-variant mt-1 text-right">{bio.length}/500</p>
              </div>

              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">WhatsApp Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-outline bg-surface-container-low font-label-md text-on-surface-variant">+91</span>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full px-4 py-3 rounded-r-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            {isFirstTime ? (
              <>
                <button
                  onClick={handleSaveStore}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </button>
                <button onClick={handleSkip} className="py-3 px-6 rounded-xl font-label-md text-on-surface-variant hover:text-on-surface border border-outline transition-all cursor-pointer">
                  Skip
                </button>
              </>
            ) : (
              <button
                onClick={handleSaveStore}
                disabled={saving}
                className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Orders Card (onboarding step or settings tab) ─────────────── */}
      {(step === "orders" && isFirstTime) || (tab === "orders" && !isFirstTime) ? (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
          <h2 className="font-headline-md text-xl text-on-surface mb-2">Order Preferences</h2>
          <p className="text-on-surface-variant mb-6">Manage how customers place orders on your storefront.</p>

          {/* Store Preferences */}
          <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
            <h3 className="font-label-md font-semibold text-on-surface">Store Preferences</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label-md text-sm text-on-surface">Allow custom orders</p>
                <p className="text-xs text-on-surface-variant">Customers can send custom order requests without selecting a product.</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <div
                  onClick={() => setAllowCustomOrders(!allowCustomOrders)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${allowCustomOrders ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: allowCustomOrders ? "translateX(20px)" : "translateX(0)" }}
                  />
                </div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label-md text-sm text-on-surface">Make to order</p>
                <p className="text-xs text-on-surface-variant">Disable stock tracking &mdash; treat all products as in stock (ideal for made-to-order businesses).</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <div
                  onClick={() => setMakeToOrder(!makeToOrder)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${makeToOrder ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: makeToOrder ? "translateX(20px)" : "translateX(0)" }}
                  />
                </div>
              </label>
            </div>
          </div>

          <h3 className="font-label-md font-semibold text-on-surface mb-4">Payment Method</h3>
          <div className="space-y-4 mb-6">
            {(["whatsapp", "razorpay"] as const).map((method) => (
              <label key={method} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                orderMethod === method ? "border-primary bg-primary-container/5" : "border-outline hover:border-primary"
              }`}>
                <input
                  type="radio" name="orderMethod" value={method}
                  checked={orderMethod === method}
                  onChange={() => setOrderMethod(method)}
                  className="mt-1 accent-primary"
                />
                <div>
                  <p className="font-label-md font-bold text-on-surface">
                    {method === "whatsapp" ? "WhatsApp Orders" : "In-App Payments (Razorpay)"}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {method === "whatsapp"
                      ? "Customers send orders directly to your WhatsApp. Simple and personal."
                      : "Customers pay directly on your store page via UPI, cards & more."}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {orderMethod === "razorpay" && (
            <div className="bg-surface-container-low rounded-xl p-4 mb-6 space-y-4">
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
                <input
                  type="text" value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value.trim())}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="rzp_live_xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block font-label-md text-sm text-on-surface mb-1">Razorpay Key Secret</label>
                <input
                  type="password" value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value.trim())}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder="xxxxxxxxxxxxxxxx"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSaveOrders} disabled={saving}
            className="w-full py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
          >
            {saving ? "Saving..." : isFirstTime ? "Save & Continue" : "Save Changes"}
          </button>
          {isFirstTime && (
            <button onClick={handleSkip} className="mt-3 w-full py-3 rounded-xl font-label-md text-on-surface-variant hover:text-on-surface border border-outline transition-all cursor-pointer">
              Skip
            </button>
          )}
        </div>
      ) : null}

      {/* ── Password Tab (settings only) ─────────────────────────────── */}
      {tab === "password" && !isFirstTime && !newEmail && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">mail</span>
          <h2 className="font-headline-md text-xl text-on-surface mb-2">Password</h2>
          <p className="text-on-surface-variant">Please add an email address in your <button onClick={() => setTab("store")} className="text-primary underline cursor-pointer">Store tab</button> first.</p>
        </div>
      )}
      {tab === "password" && !isFirstTime && newEmail && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
          <h2 className="font-headline-md text-xl text-on-surface mb-2">{hasPasswordAuth ? "Change Password" : "Set Password"}</h2>
          <p className="text-on-surface-variant mb-6">{hasPasswordAuth ? "Update your account password." : "Set a password to sign in with your email."}</p>

          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-label-sm text-red-600 mb-4">{passwordError}</div>
          )}
          {passwordMsg && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-label-sm text-green-600 mb-4">{passwordMsg}</div>
          )}

          <div className="space-y-4">
            {[
              ...(hasPasswordAuth ? [{ label: "Current Password", value: currentPassword, set: setCurrentPassword, ph: "Enter current password" }] : []),
              { label: "New Password", value: newPassword, set: setNewPassword, ph: "Min 6 characters" },
              { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, ph: "Re-enter new password" },
            ].map(({ label, value, set, ph }) => (
              <div key={label}>
                <label className="block font-label-md text-sm text-on-surface mb-1">{label}</label>
                <input
                  type="password" value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline focus:border-primary-container focus:ring-4 focus:ring-primary-container/10 transition-all bg-white font-body-md"
                  placeholder={ph}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleChangePassword} disabled={saving}
            className="w-full mt-8 py-3 rounded-xl font-label-md text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: "#ff6b35", boxShadow: "0 8px 16px rgba(255,107,53,0.2)" }}
          >
            {saving ? "Saving..." : hasPasswordAuth ? "Change Password" : "Set Password"}
          </button>
        </div>
      )}

      {cropFile && (
        <CropModal file={cropFile} onCrop={handleCropComplete} onClose={() => setCropFile(null)} />
      )}
    </div>
  );
}
