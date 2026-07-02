import Link from "next/link";

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <Link href="/policies" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Policies
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">Refund Policy</h1>
        <p className="text-sm text-on-surface-variant mb-6"><strong>Last updated:</strong> July 2, 2026</p>

        <p className="text-on-surface mb-4">
          <em>Platform Subscription</em>
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">Subscription Fees</h2>
        <p className="text-on-surface mb-4">
          Sellri charges ₹59/month for platform access. This fee is charged at the start of each billing period.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">Refunds</h2>
        <p className="text-on-surface mb-2">
          Subscription fees are non-refundable once the billing period has commenced, except where:
        </p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>A verified technical failure on Sellri&apos;s part prevented you from accessing the platform for a significant portion of the billing period</li>
          <li>You were charged incorrectly due to a billing error on our part</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">How to Request a Refund</h2>
        <p className="text-on-surface mb-2">
          Email <a href="mailto:hello@sellri.in" className="text-primary hover:underline">hello@sellri.in</a> within 7 days of the charge with:
        </p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Your registered phone number or email</li>
          <li>The date and amount charged</li>
          <li>A brief description of the issue</li>
        </ul>
        <p className="text-on-surface mb-4">
          We will respond within 3 business days. Approved refunds are processed within 7 business days via the original
          payment method.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">Cancellation</h2>
        <p className="text-on-surface mb-4">
          Cancelling your subscription stops future charges. It does not trigger a refund for the current billing period.
          Your storefront remains active until the end of the period you have paid for.
        </p>
      </div>
    </main>
  );
}
