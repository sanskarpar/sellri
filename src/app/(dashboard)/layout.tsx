import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Dashboard — Sellri",
  description: "Manage your products, orders, and storefront settings from your Sellri dashboard.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface to-primary-fixed/20">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 md:p-8 md:ml-60">
          {children}
        </main>
      </div>
    </div>
  );
}
