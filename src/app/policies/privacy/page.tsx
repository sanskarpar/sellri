import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <Link href="/policies" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Policies
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">Privacy Policy</h1>
        <p className="text-sm text-on-surface-variant mb-6"><strong>Last updated:</strong> July 2, 2026</p>

        <p className="text-on-surface mb-6">
          This Privacy Policy explains how Sellri, operated by Sanskar Paradeshi, collects, uses, stores, and protects
          information about sellers who use the Sellri platform.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">1. Information We Collect</h2>
        <p className="text-on-surface font-semibold mb-1">From sellers (you):</p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-3">
          <li>Name, email address, phone number / WhatsApp number</li>
          <li>Business name and profile information</li>
          <li>Product listings, photos, descriptions, and prices</li>
          <li>Payment information (processed via Razorpay &mdash; we do not store card details)</li>
          <li>Usage data: pages visited, features used, login times</li>
        </ul>
        <p className="text-on-surface font-semibold mb-1">From buyers (your customers, via your storefront):</p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Name, phone number, delivery address, and order details collected at checkout</li>
          <li>This data is collected on your behalf and stored to enable order tracking</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">2. How We Use Your Information</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>To provide, operate, and improve the Sellri platform</li>
          <li>To process subscription payments via Razorpay</li>
          <li>To send you service-related communications (renewal reminders, feature updates, support)</li>
          <li>To display your storefront and product listings to buyers</li>
          <li>To comply with legal obligations</li>
        </ul>
        <p className="text-on-surface mb-4">
          We do not sell, rent, or share your personal information with third parties for marketing purposes.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">3. Buyer Data</h2>
        <p className="text-on-surface mb-4">
          As a seller using Sellri, you are the data controller for your buyers&apos; personal information collected
          through your storefront. You are responsible for handling that data in accordance with applicable privacy
          laws and your own published privacy policy. Sellri processes buyer data on your behalf solely to provide order
          management functionality.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">4. Data Sharing</h2>
        <p className="text-on-surface mb-2">We share data only in the following limited circumstances:</p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li><strong>Razorpay:</strong> for payment processing</li>
          <li><strong>Supabase / hosting providers:</strong> for secure data storage and platform operation</li>
          <li><strong>Legal obligations:</strong> if required by law, court order, or government authority</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">5. Data Storage and Security</h2>
        <p className="text-on-surface mb-4">
          Your data is stored on secure cloud infrastructure. We implement reasonable technical and organisational
          measures to protect against unauthorised access, loss, or misuse. However, no system is completely secure
          and we cannot guarantee absolute security.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">6. Data Retention</h2>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Active account data is retained for as long as your account is active.</li>
          <li>Upon cancellation, data is retained for 30 days then deleted, unless legal obligations require longer retention.</li>
          <li>You may request deletion of your data at any time by contacting <a href="mailto:hello@sellri.in" className="text-primary hover:underline">hello@sellri.in</a>.</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">7. Cookies</h2>
        <p className="text-on-surface mb-4">
          Sellri uses essential cookies to maintain your login session and basic platform functionality. We do not use
          advertising or tracking cookies.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">8. Your Rights</h2>
        <p className="text-on-surface mb-2">You have the right to:</p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Withdraw consent for data processing where applicable</li>
        </ul>
        <p className="text-on-surface mb-4">
          To exercise any of these rights, contact <a href="mailto:hello@sellri.in" className="text-primary hover:underline">hello@sellri.in</a>.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">9. Third-Party Links</h2>
        <p className="text-on-surface mb-4">
          Your storefront may contain links to WhatsApp or other external services. Sellri is not responsible for the
          privacy practices of those services.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">10. Changes to This Policy</h2>
        <p className="text-on-surface mb-4">
          We may update this policy periodically. Material changes will be communicated via email or WhatsApp at least
          7 days in advance.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">11. Contact</h2>
        <p className="text-on-surface mb-4">
          For privacy-related queries, contact <a href="mailto:hello@sellri.in" className="text-primary hover:underline">hello@sellri.in</a>.
        </p>
      </div>
    </main>
  );
}
