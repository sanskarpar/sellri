import Link from "next/link";

export default function PoliciesIndex() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">Sellri Platform Policies</h1>
        <p className="text-on-surface-variant mb-10">For sellers who sign up and use the Sellri platform</p>

        <div className="grid gap-4">
          <Link href="/policies/terms" className="block p-6 rounded-xl border border-outline-variant/30 hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-lg font-semibold text-on-surface">Terms &amp; Conditions</h2>
            <p className="text-sm text-on-surface-variant mt-1">Terms governing your access to and use of the Sellri platform.</p>
          </Link>
          <Link href="/policies/privacy" className="block p-6 rounded-xl border border-outline-variant/30 hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-lg font-semibold text-on-surface">Privacy Policy</h2>
            <p className="text-sm text-on-surface-variant mt-1">How Sellri collects, uses, stores, and protects your information.</p>
          </Link>
          <Link href="/policies/refund" className="block p-6 rounded-xl border border-outline-variant/30 hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-lg font-semibold text-on-surface">Refund Policy</h2>
            <p className="text-sm text-on-surface-variant mt-1">Subscription fee refunds and cancellation policies.</p>
          </Link>
          <Link href="/policies/acceptable-use" className="block p-6 rounded-xl border border-outline-variant/30 hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-lg font-semibold text-on-surface">Acceptable Use Policy</h2>
            <p className="text-sm text-on-surface-variant mt-1">What you may and may not do on the Sellri platform.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
