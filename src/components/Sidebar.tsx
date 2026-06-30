"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLockBody } from "@/hooks/useLockBody";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/products", label: "Products", icon: "inventory_2" },
  { href: "/orders", label: "Orders", icon: "receipt_long" },
  { href: "/storefront", label: "Storefront", icon: "palette" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useLockBody(open);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.07)" }}
        aria-label="Open sidebar"
      >
        <span className="material-symbols-outlined text-on-surface">menu</span>
      </button>

      {/* Overlay (mobile) */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:fixed top-0 md:top-16 left-0 z-50 h-screen md:h-[calc(100vh-4rem)] bg-white border-r border-outline-variant/30 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ width: 240, minWidth: 240 }}
      >
        {/* Close button (mobile) */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/6 transition-colors"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
        </button>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                }`}
                style={isActive ? { backgroundColor: "rgba(255,107,53,0.08)" } : {}}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{link.icon}</span>
                <span className="font-label-md text-sm">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-outline-variant/20">
          <Link
            href="/signin"
            onClick={() => {
              localStorage.removeItem("sellri_user");
              setOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:text-red-600 hover:bg-red-50 transition-all font-label-md text-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            Sign Out
          </Link>
        </div>
      </aside>
    </>
  );
}
