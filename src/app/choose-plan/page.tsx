import type { Metadata } from "next";
import ChoosePlanPage from "./_components/ChoosePlanPage";

export const metadata: Metadata = {
  title: "Choose Your Plan — Sellri",
  description:
    "Pick the perfect subscription plan for your social commerce business. Start with a 14-day free trial — no payment details required.",
  openGraph: {
    title: "Choose Your Plan — Sellri",
    description:
      "Pick the perfect plan for your social commerce business. 14-day free trial, no payment details required.",
    url: "https://sellri.in/choose-plan",
  },
};

export default function ChoosePlan() {
  return <ChoosePlanPage />;
}
