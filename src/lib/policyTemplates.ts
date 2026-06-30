export type PolicyType = "privacy" | "terms" | "refunds";

export const POLICY_LABELS: Record<PolicyType, string> = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  refunds: "Refund & Cancellation Policy",
};

export const POLICY_DEFAULTS: Record<PolicyType, string> = {
  privacy: `Privacy Policy

Last updated: [DATE]

This Privacy Policy describes how [SELLER NAME] ("we," "us," or "the seller"), operating on the Sellri platform, collects, uses, and protects your information when you visit this page or place an order.

Information We Collect

When you place an order through this page, we may collect:

- Your name
- Phone number / WhatsApp number
- Delivery address
- Order details (products, quantity, price)

We do not collect payment card information directly. Payments are processed through WhatsApp, UPI, or third-party payment gateways, and we do not store your payment credentials.

How We Use Your Information

We use the information you provide solely to:

- Process and fulfil your order
- Communicate with you about your order via WhatsApp
- Improve our service to you

We do not sell, rent, or share your personal information with third parties for marketing purposes.

Data Storage

Order and contact information is stored securely and retained only as long as necessary to fulfil orders and maintain business records.

Your Rights

You may request that we delete your personal information at any time by contacting us via WhatsApp or email at [SELLER CONTACT].

Changes to This Policy

This policy may be updated periodically. Continued use of this page after changes constitutes acceptance of the revised policy.

Contact

For questions about this policy, contact [SELLER NAME] at [SELLER WHATSAPP/EMAIL].`,

  terms: `Terms & Conditions

Last updated: [DATE]

By placing an order through this page, you agree to the following terms.

Orders

All orders placed through this page are subject to availability. [SELLER NAME] reserves the right to cancel any order due to stock unavailability, pricing errors, or other reasonable circumstances, with notice provided to the buyer.

Pricing

All prices listed are in [CURRENCY] and are subject to change without prior notice. The price applicable is the price displayed at the time of order confirmation.

Payment

Payment is to be made via the method communicated by the seller (UPI, WhatsApp Pay, bank transfer, or other agreed method). Orders are confirmed only upon receipt of payment, unless otherwise agreed with the seller.

Delivery

Delivery timelines are estimates provided by the seller and may vary due to factors outside our control, including courier delays, weather, or stock availability. [SELLER NAME] will communicate any expected delays to the buyer.

Product Accuracy

We make reasonable efforts to ensure product photos and descriptions are accurate. Slight variations in color, size, or appearance may occur, particularly for handmade or homemade products.

Limitation of Liability

[SELLER NAME] is not liable for indirect, incidental, or consequential damages arising from the use of products purchased through this page.

Governing Law

These terms are governed by the laws of India.

Contact

For questions about these terms, contact [SELLER NAME] at [SELLER WHATSAPP/EMAIL].`,

  refunds: `Refund & Cancellation Policy

Last updated: [DATE]

Cancellations

Orders may be cancelled before they are packed or shipped. To cancel an order, contact [SELLER NAME] directly via WhatsApp as soon as possible.

Refunds

Refunds, if applicable, will be processed within [X] business days of approval, using the original payment method where possible.

Non-Returnable Items

Due to the nature of certain products (including perishable, homemade, or customized items), returns and refunds may not be accepted once the order has been dispatched, except in cases of:

- Damaged or defective products received
- Incorrect items delivered
- Significant deviation from the product as described

Reporting an Issue

If you receive a damaged, defective, or incorrect item, please contact [SELLER NAME] within [X] hours/days of delivery with photos of the issue, via WhatsApp at [SELLER WHATSAPP].

Resolution

Upon review, [SELLER NAME] will offer a replacement, store credit, or refund at their discretion, depending on the nature of the issue.

Contact

For refund or cancellation queries, contact [SELLER NAME] at [SELLER WHATSAPP/EMAIL].`,
};

export function fillPolicyTemplate(template: string, sellerName: string, sellerContact: string, sellerWhatsapp: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  return template
    .replace(/\[DATE\]/g, dateStr)
    .replace(/\[SELLER NAME\]/g, sellerName)
    .replace(/\[SELLER WHATSAPP\/EMAIL\]/g, sellerContact)
    .replace(/\[SELLER WHATSAPP\]/g, sellerWhatsapp)
    .replace(/\[SELLER CONTACT\]/g, sellerContact)
    .replace(/\[CURRENCY\]/g, "INR")
    .replace(/\[X\]/g, "7");
}
