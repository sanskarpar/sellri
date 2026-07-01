import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { phone, email, reference } = await req.json();

    if (!adminDb) {
      return NextResponse.json({ error: "Tracking service not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY in environment." }, { status: 500 });
    }

    const ordersRef = adminDb.collectionGroup("orders");
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    if (reference) {
      const ref = reference.startsWith("#") ? reference : `#${reference.toUpperCase()}`;
      query = ordersRef.where("reference", "==", ref).limit(5);
    } else if (phone) {
      query = ordersRef.where("customerPhone", "==", phone.trim()).limit(20);
    } else if (email) {
      query = ordersRef.where("customerEmail", "==", email.toLowerCase().trim()).limit(20);
    } else {
      return NextResponse.json({ error: "Provide phone, email, or reference" }, { status: 400 });
    }

    const snap = await query.get();
    const results: any[] = [];

    snap.forEach((d) => {
      const data = d.data();
      // Client-side filter for combined searches
      if (phone && email && data.customerPhone !== phone.trim()) return;
      if (phone && email && data.customerEmail !== email.toLowerCase().trim()) return;
      if (phone && reference && data.customerPhone !== phone.trim()) return;
      if (email && reference && data.customerEmail !== email.toLowerCase().trim()) return;

      results.push({
        id: d.id,
        reference: data.reference,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        total: data.total,
        status: data.status,
        items: data.items || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      });
    });

    if (results.length === 0) {
      return NextResponse.json({ orders: [], error: null });
    }

    return NextResponse.json({ orders: results, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ orders: [], error: message }, { status: 500 });
  }
}
