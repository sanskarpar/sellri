import Link from "next/link";

export default function AcceptableUsePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <Link href="/policies" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Policies
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">Acceptable Use Policy</h1>
        <p className="text-sm text-on-surface-variant mb-6"><strong>Last updated:</strong> July 2, 2026</p>

        <p className="text-on-surface mb-4">
          This policy defines what you may and may not do on the Sellri platform.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">Permitted Use</h2>
        <p className="text-on-surface mb-4">
          Sellri is intended for independent sellers listing and selling legitimate physical products &mdash; including
          homemade food, handmade goods, clothing, jewelry, skincare, and similar items.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">Prohibited Use</h2>
        <p className="text-on-surface mb-2">You may not use Sellri to:</p>
        <ul className="list-disc pl-6 text-on-surface space-y-1 mb-4">
          <li>Sell illegal, counterfeit, or prohibited products</li>
          <li>Misrepresent products through false descriptions or misleading photos</li>
          <li>Collect buyer information for purposes other than fulfilling orders</li>
          <li>Engage in spam, phishing, or fraudulent activity</li>
          <li>Impersonate another seller or business</li>
          <li>Attempt to reverse-engineer, scrape, or disrupt the Sellri platform</li>
          <li>Use the platform in a way that violates any applicable Indian law</li>
        </ul>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">Enforcement</h2>
        <p className="text-on-surface mb-4">
          Violations of this policy may result in immediate account suspension or termination without refund. Serious
          violations may be reported to relevant authorities.
        </p>

        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-3">Reporting Violations</h2>
        <p className="text-on-surface mb-4">
          If you become aware of a seller violating this policy, report it to <a href="mailto:hello@sellri.in" className="text-primary hover:underline">hello@sellri.in</a>.
        </p>
      </div>
    </main>
  );
}
