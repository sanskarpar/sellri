import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let adminDb: ReturnType<typeof getFirestore> | null = null;

try {
  if (serviceAccount) {
    const parsed = JSON.parse(serviceAccount);
    if (!getApps().length) {
      initializeApp({ credential: cert(parsed) });
    }
    adminDb = getFirestore();
  }
} catch {
  // Admin SDK not configured
}

export { adminDb };
