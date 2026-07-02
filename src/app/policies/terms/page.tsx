import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <Link href="/policies" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Policies
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-on-surface-variant mb-1"><strong>Last updated:</strong> July 2, 2026</p>
        <p className="text-sm text-on-surface-variant mb-6"><strong>Effective date:</strong> July 2, 2026</p>

        <p className="text-on-surface mb-6">
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the Sellri platform
          (&ldquo;Sellri,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), operated by Sanskar Paradeshi.
          By creating an account on Sellri, you (&ldquo;Seller,&rdquo; &ldquo;you&rdquo;) agree to be bound by these Terms.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">1. The Service</h2>
        <p className="text-on-surface mb-4">
          Sellri provides small and independent sellers with a hosted storefront page, accessible via a shareable link,
          to list products and receive orders. Sellri is a tool &mdash; we are not a party to any transaction between you
          and your buyers. All sales, payments, disputes, and obligations between you and your buyers are solely your
          responsibility.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">2. Eligibility</h2>
        <p className="text-on-surface mb-4">
          You must be at least 18 years old to create a Sellri account. By signing up, you confirm that you are legally
          permitted to conduct business in your jurisdiction and that the products you sell comply with all applicable laws.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">3. Account Responsibilities</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>You must provide accurate information during signup and keep it updated.</li>
          <li>You may not share, sell, or transfer your account to another person.</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">4. Acceptable Use</h2>
        <p className="text-on-surface mb-2">You agree not to use Sellri to sell:</p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Illegal products or services of any kind</li>
          <li>Counterfeit, pirated, or trademark-infringing goods</li>
          <li>Alcohol, tobacco, or controlled substances</li>
          <li>Adult content or sexually explicit material</li>
          <li>Weapons, explosives, or dangerous goods</li>
          <li>Products that violate any applicable Indian or international law</li>
        </ul>
        <p className="text-on-surface mb-4">
          Sellri reserves the right to suspend or terminate any account found in violation of this clause without prior
          notice or refund.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">5. Your Storefront and Content</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>You retain ownership of all content (photos, descriptions, prices) you upload to Sellri.</li>
          <li>By uploading content, you grant Sellri a non-exclusive, royalty-free licence to display that content as part of providing the service (i.e. showing it on your storefront page).</li>
          <li>You are solely responsible for ensuring your product listings are accurate, not misleading, and legally compliant.</li>
          <li>Sellri may remove any content that violates these Terms or applicable law.</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">6. Payments and Subscription</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Sellri charges a subscription fee of ₹149/month for access to the platform.</li>
          <li>Payments are processed via Razorpay. By subscribing, you authorise recurring charges to your payment method on a monthly basis.</li>
          <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
          <li>You will receive a reminder via WhatsApp or email before each renewal.</li>
          <li>Sellri does not store your payment card details &mdash; these are handled securely by Razorpay.</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">7. Refunds</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Subscription fees are non-refundable once the billing period has started, except in cases of a verified technical failure on Sellri&apos;s part that prevented access to the service.</li>
          <li>Refund requests must be submitted within 7 days of the charge via <a href="mailto:hello@sellri.in" className="text-primary hover:underline">hello@sellri.in</a>.</li>
          <li>Refunds, if approved, will be processed within 7 business days.</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">8. Cancellation</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>You may cancel your subscription at any time from your account settings.</li>
          <li>Upon cancellation, your account remains active until the end of the current billing period.</li>
          <li>After the billing period ends, your storefront will be deactivated and your data retained for 30 days before deletion, giving you time to reactivate if needed.</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">9. Service Availability</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Sellri aims for maximum uptime but does not guarantee uninterrupted service.</li>
          <li>We are not liable for losses arising from downtime, technical failures, or disruptions outside our reasonable control.</li>
          <li>We will communicate scheduled maintenance in advance where possible.</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">10. Termination by Sellri</h2>
        <p className="text-on-surface mb-2">Sellri may suspend or terminate your account at any time for:</p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Violation of these Terms</li>
          <li>Fraudulent or illegal activity</li>
          <li>Non-payment of subscription fees</li>
          <li>Any conduct that Sellri reasonably believes harms the platform, other users, or buyers</li>
        </ul>
        <p className="text-on-surface mb-4">
          In cases of termination for policy violation, no refund will be issued.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">11. Limitation of Liability</h2>
        <p className="text-on-surface mb-4">
          To the maximum extent permitted by law, Sellri&apos;s total liability to you for any claim arising from use of
          the platform shall not exceed the amount you paid to Sellri in the 30 days preceding the claim. Sellri is not
          liable for indirect, incidental, special, or consequential damages including lost profits, lost orders, or
          reputational damage.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">12. Indemnification</h2>
        <p className="text-on-surface mb-4">
          You agree to indemnify and hold harmless Sellri and its operators from any claims, damages, or expenses
          (including legal fees) arising from your use of the platform, your product listings, your transactions with
          buyers, or your violation of these Terms.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">13. Changes to Terms</h2>
        <p className="text-on-surface mb-4">
          Sellri may update these Terms from time to time. We will notify you via email or WhatsApp at least 7 days
          before material changes take effect. Continued use of the platform after that date constitutes acceptance
          of the revised Terms.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">14. Governing Law and Disputes</h2>
        <p className="text-on-surface mb-4">
          These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction
          of the courts of Pune, India.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">15. Contact</h2>
        <p className="text-on-surface mb-4">
          For questions about these Terms, contact us at <a href="mailto:hello@sellri.in" className="text-primary hover:underline">hello@sellri.in</a>.
        </p>
      </div>
    </main>
  );
}
