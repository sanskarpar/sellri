import { NextRequest, NextResponse } from "next/server";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const PLAN_DURATIONS: Record<string, number> = {
  "1month": 30,
  "3months": 90,
  "6months": 180,
  "12months": 365,
};

async function rzpFetch(path: string) {
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const res = await fetch(`https://api.razorpay.com${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.description || "Razorpay error");
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.warn("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not set, skipping");
      return NextResponse.json({ status: "skipped" });
    }

    // Verify webhook signature
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    // Handle subscription charged events
    if (eventType === "subscription.charged") {
      const subId: string = event.payload.subscription?.entity?.id || "";
      const notes = event.payload.subscription?.entity?.notes || {};
      const uid: string = notes.uid || "";
      const planKey: string = notes.planKey || "";

      if (!uid || !planKey || !subId) {
        return NextResponse.json({ error: "Missing subscription data" }, { status: 400 });
      }

      const durationDays = PLAN_DURATIONS[planKey];
      if (!durationDays) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      // Try Admin SDK (optional — works only if FIREBASE_SERVICE_ACCOUNT_KEY is set)
      try {
        const { adminDb } = await import("@/lib/firebase-admin");
        if (adminDb) {
          const userRef = adminDb.collection("users").doc(uid);
          const userSnap = await userRef.get();
          const currentEnd = userSnap.data()?.subscriptionEndsAt?.toDate?.() || new Date();
          const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + durationDays * 24 * 60 * 60 * 1000);
          await userRef.set({
            plan: "paid",
            subscriptionId: subId,
            subscriptionEndsAt: newEnd,
            updatedAt: new Date(),
          }, { merge: true });
        }
      } catch {
        console.warn("[razorpay-webhook] Admin SDK not available, cannot update Firestore");
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("[razorpay-webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
