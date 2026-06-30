"use client";

import { useState } from "react";

type ContactMethod = "whatsapp" | "email";

type FormSectionProps = {
  title?: string;
  description?: string;
  contactMethod?: ContactMethod;
  whatsapp?: string;
  showWhatsappContact?: boolean;
  recipientEmail?: string;
  buttonLabel?: string;
  phone?: string;
  email?: string;
  address?: string;
  bgColor?: string;
  bgGradient?: string;
  bgImage?: string;
  primaryColor?: string;
};

export default function FormSection({
  title = "Contact Us",
  description = "",
  contactMethod = "whatsapp",
  whatsapp = "",
  showWhatsappContact = false,
  recipientEmail = "",
  buttonLabel = "Send Inquiry",
  phone = "",
  email = "",
  address = "",
  bgColor = "",
  bgGradient = "",
  bgImage = "",
  primaryColor = "",
}: FormSectionProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const accentColor = primaryColor || "var(--color-primary, #ff6b35)";

  const sectionBg = bgGradient
    ? { background: bgGradient }
    : bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : bgColor
    ? { backgroundColor: bgColor }
    : {};

  async function handleEmail() {
    if (!recipientEmail) {
      setError("Recipient email is not configured for this form.");
      return;
    }
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!senderEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!message.trim()) { setError("Please enter a message."); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `New Inquiry from ${name || "a visitor"}`,
          text: `New inquiry from your store contact form.\n\nName: ${name || "Not provided"}\nEmail: ${senderEmail || "Not provided"}\nMessage: ${message || "Not provided"}\n\n---\nThis is a non-reply email. Please reply to the customer directly using the contact information provided above.\nSent via Sellri`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:${accentColor}">New Contact Form Inquiry</h2>
              <table style="width:100%;border-collapse:collapse;margin-top:16px">
                <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:100px">Name</td><td style="padding:8px 12px">${name || "Not provided"}</td></tr>
                <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:600">Email</td><td style="padding:8px 12px">${senderEmail || "Not provided"}</td></tr>
                <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:600;vertical-align:top">Message</td><td style="padding:8px 12px">${message || "Not provided"}</td></tr>
              </table>
              <p style="margin-top:24px;padding:12px;background:#fef3f2;border-radius:8px;font-size:13px;color:#b42318;border:1px solid #fecdca"><strong>Non-reply:</strong> This email was sent automatically. Please reply to the customer directly using the contact information above.</p>
              <p style="margin-top:16px;font-size:12px;color:#888">Sent via Sellri contact form</p>
            </div>
          `,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
      setName("");
      setMessage("");
      setSenderEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="w-full py-10 md:py-14 px-4"
      style={sectionBg}
    >
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {title && (
            <h2 className="font-display-lg text-3xl md:text-4xl font-bold text-on-surface mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-on-surface-variant text-sm md:text-base">
              {description}
            </p>
          )}
        </div>

        {/* WhatsApp: just a button */}
        {contactMethod === "whatsapp" ? (
          <div className="text-center">
            {whatsapp ? (
              <a
                href={`https://wa.me/91${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all hover:opacity-90 active:scale-[0.99] shadow-sm bg-white border border-outline-variant/20 text-[#25D366]"
              >
                <svg className="w-6 h-6 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contact on WhatsApp
              </a>
            ) : (
              <p className="text-on-surface-variant text-sm">WhatsApp contact not configured.</p>
            )}
          </div>
        ) : (
          /* Email: full form */
          sent ? (
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-8 md:p-10 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-on-surface">Inquiry Sent!</p>
              <p className="text-on-surface-variant mt-2">We'll get back to you within 24 hours.</p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-sm font-medium cursor-pointer transition-colors"
                style={{ color: accentColor }}
              >
                Send another inquiry &rarr;
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-6 md:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-label-md font-semibold text-on-surface mb-1.5">
                    Your Name <span style={{ color: accentColor }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: accentColor, ["--tw-ring-opacity" as any]: "1" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-md font-semibold text-on-surface mb-1.5">
                    Your Email <span style={{ color: accentColor }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all focus:border-transparent focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: accentColor, ["--tw-ring-opacity" as any]: "1" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label-md font-semibold text-on-surface mb-1.5">
                  Message <span style={{ color: accentColor }}>*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you're looking for..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all resize-none focus:border-transparent focus:ring-2"
                  style={{ ["--tw-ring-color" as any]: accentColor, ["--tw-ring-opacity" as any]: "1" }}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleEmail}
                disabled={sending}
                className="w-full h-13 py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60 cursor-pointer shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                {sending ? "Sending..." : buttonLabel}
              </button>
            </div>
          )
        )}

      </div>
    </div>
  );
}
