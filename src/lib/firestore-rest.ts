const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const BASE = `https://firestore.googleapis.com/v1/projects/sellri1/databases/(default)/documents`;

interface DecodedDoc {
  id: string;
  data: Record<string, any>;
}

function decodeValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.mapValue?.fields) return decodeFields(val.mapValue.fields);
  if (val.arrayValue?.values) return val.arrayValue.values.map(decodeValue);
  return null;
}

function decodeFields(fields: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    obj[key] = decodeValue(val);
  }
  return obj;
}

function extractDoc(doc: any): DecodedDoc | null {
  if (!doc) return null;
  const id = doc.name.split("/").pop();
  return { id, data: decodeFields(doc.fields || {}) };
}

function inferValue(val: any): any {
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  return { stringValue: String(val) };
}

async function query(parent: string, collectionId: string, opts?: {
  filters?: { field: string; op: string; value: any }[];
  orderBy?: string;
  orderDir?: "ASCENDING" | "DESCENDING";
  limit?: number;
}): Promise<DecodedDoc[]> {
  const q: any = { structuredQuery: { from: [{ collectionId }] } };

  if (opts?.filters?.length) {
    const filters = opts.filters.map((f) => ({
      fieldFilter: {
        field: { fieldPath: f.field },
        op: f.op,
        value: inferValue(f.value),
      },
    }));
    q.structuredQuery.where = { compositeFilter: { op: "AND", filters } };
  }

  if (opts?.orderBy) {
    q.structuredQuery.orderBy = [{
      field: { fieldPath: opts.orderBy },
      direction: opts.orderDir || "ASCENDING",
    }];
  }

  if (opts?.limit) {
    q.structuredQuery.limit = opts.limit;
  }

  const url = `${BASE}${parent ? "/" + parent : ""}:runQuery?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(q),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore query failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const results = await res.json();
  return results.map((r: any) => extractDoc(r.document)).filter(Boolean);
}

export async function fetchStoreBySlug(slug: string): Promise<DecodedDoc | null> {
  const docs = await query("", "users", {
    filters: [{ field: "slug", op: "EQUAL", value: slug }],
    limit: 1,
  });
  return docs[0] || null;
}

export async function fetchSellerProducts(sellerId: string): Promise<DecodedDoc[]> {
  return query(`users/${sellerId}`, "products", {
    orderBy: "createdAt",
    orderDir: "DESCENDING",
  });
}
