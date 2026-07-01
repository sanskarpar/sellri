import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_MS = 60_000;
const rateMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    if (!to) {
      return NextResponse.json({ error: "Missing recipient" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const last = rateMap.get(ip);
    const now = Date.now();
    if (last && now - last < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
      return NextResponse.json({ error: `Please wait ${remaining}s before requesting another OTP` }, { status: 429 });
    }
    rateMap.set(ip, now);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const SMTP_HOST = process.env.SMTP_HOST || "smtpout.secureserver.net";
    const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
    const SMTP_USER = process.env.SMTP_USER || "hello@sellri.in";
    const SMTP_PASS = process.env.SMTP_PASS;

    if (!SMTP_PASS) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"Sellri" <${SMTP_USER}>`,
      to,
      subject: "Your OTP for Order Tracking",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="font-size:18px;margin:0 0 16px;color:#1a1a1a">Order Tracking OTP</h2>
          <p style="color:#555;font-size:14px;margin:0 0 8px">Use the following OTP to track your order:</p>
          <div style="background:#f8f9fa;border-radius:12px;padding:20px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:700;color:#ff6b35;margin:16px 0">${otp}</div>
          <p style="color:#999;font-size:12px;margin:0">This OTP expires in 5 minutes.</p>
        </div>`.trim(),
    });

    // Store OTP with expiry
    const { db } = await import("@/lib/firebase");
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    await setDoc(doc(db, "otps", `${to}_${otp}`), {
      to,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      used: false,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
