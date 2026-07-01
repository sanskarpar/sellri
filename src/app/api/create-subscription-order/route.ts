import { NextRequest, NextResponse } from "next/server";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

const PLAN_PRICES: Record<string, number> = {
  "1month": 59,
  "3months": 149,
  "6months": 249,
  "12months": 449,
};

const PLAN_DURATIONS: Record<string, number> = {
  "1month": 30,
  "3months": 90,
  "6months": 180,
  "12months": 365,
};

async function rzpFetch(path: string, options?: RequestInit) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = data.error?.description || data.error?.message || JSON.stringify(data);
    throw new Error(detail);
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    const { uid, planKey, amount } = await req.json();
    if (!uid || !planKey || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const data = await rzpFetch("/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: `${Date.now().toString(36)}_${uid.slice(0, 8)}`.slice(0, 40),
        notes: { uid, planKey },
      }),
    });

    return NextResponse.json({
      orderId: data.id,
      amount: data.amount,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    const { uid, planKey, razorpayPaymentId, razorpayOrderId, razorpaySignature } = await req.json();
    if (!uid || !planKey || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify signature: HMAC(order_id + "|" + payment_id, key_secret)
    const { createHmac } = await import("crypto");
    const expectedSig = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    if (expectedSig !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Fetch the order to confirm amount matches plan
    const order = await rzpFetch(`/v1/orders/${razorpayOrderId}`);
    const expectedPrice = PLAN_PRICES[planKey] * 100;
    if (Number(order.amount) !== expectedPrice) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    return NextResponse.json({ success: true, uid, planKey, durationDays: PLAN_DURATIONS[planKey] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
