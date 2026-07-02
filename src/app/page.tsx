import type { Metadata } from "next";
import LandingPage from "./_components/LandingPage";

export const metadata: Metadata = {
  title: "Sellri — Social Commerce Platform for India",
  description:
    "Transform your Instagram, WhatsApp, and social media into a professional storefront. Create your free store page in 60 seconds. No coding required.",
  openGraph: {
    title: "Sellri — Social Commerce Platform for India",
    description:
      "Transform your social media into a professional storefront. Create your free store page in 60 seconds.",
    url: "https://sellri.in",
  },
};

export default function Home() {
  return <LandingPage />;
}