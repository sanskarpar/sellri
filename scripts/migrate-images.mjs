import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";

// Usage: node scripts/migrate-images.mjs <path-to-service-account-key.json> [prefix]

const keyPath = process.argv[2];
if (!keyPath) {
  console.error("Usage: node scripts/migrate-images.mjs <path-to-service-account-key.json> [prefix]");
  process.exit(1);
}

const targetPrefix = process.argv[3];

initializeApp({
  credential: cert(keyPath),
  storageBucket: "sellri1.firebasestorage.app",
});

const bucket = getStorage().bucket();

const CONFIGS = [
  {
    prefix: "products/",
    label: "Product images",
    sizes: [
      { name: "200x200", resize: { width: 200, height: 200, fit: "cover", position: "center" } },
      { name: "600x600", resize: { width: 600, height: 600, fit: "cover", position: "center" } },
    ],
  },
  {
    prefix: "storefront/",
    label: "Storefront bg images",
    // Only process files named bg, pagebg, logo, footer_logo (extensionless uploads)
    includeNames: new Set(["bg", "pagebg", "logo", "footer_logo"]),
    sizes: [
      { name: "1920", resize: { width: 1920, fit: "inside" } },
    ],
  },
];

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VARIANT_RE = /_(200x200|600x600|1920)\.webp$/;

async function isImageFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) return true;
  try {
    const [meta] = await file.getMetadata();
    return IMAGE_MIMES.includes(meta.contentType);
  } catch {
    return false;
  }
}

async function processPrefix(config) {
  const { prefix, label, sizes, includeNames } = config;
  console.log(`\n=== ${label} (${prefix}) ===`);
  console.log("Listing files...");
  const [files] = await bucket.getFiles({ prefix });
  console.log(`Total files: ${files.length}`);

  const existingNames = new Set(files.map(f => f.name));

  const originals = [];
  for (const file of files) {
    if (VARIANT_RE.test(file.name)) continue;

    // For storefront, only process specific named files
    const fileName = file.name.split("/").pop();
    if (includeNames && !includeNames.has(fileName)) continue;

    if (!(await isImageFile(file))) continue;

    const basePath = file.name.replace(/\.[^.]+$/, "");
    const allExist = sizes.every(s => existingNames.has(`${basePath}_${s.name}.webp`));
    if (!allExist) {
      originals.push({ file, basePath });
    }
  }

  console.log(`Originals needing processing: ${originals.length}\n`);

  let created = 0;
  let skipped = 0;

  for (const { file, basePath } of originals) {
    console.log(`  ${file.name}`);

    const [originalBuffer] = await file.download();
    console.log(`    Downloaded (${(originalBuffer.length / 1024).toFixed(0)} KB)`);

    for (const size of sizes) {
      const variantPath = `${basePath}_${size.name}.webp`;
      const variantFile = bucket.file(variantPath);

      const [alreadyExists] = await variantFile.exists();
      if (alreadyExists) {
        console.log(`    ${size.name} — already exists`);
        skipped++;
        continue;
      }

      const resizedBuffer = await sharp(originalBuffer)
        .resize(size.resize)
        .webp({ quality: 80 })
        .toBuffer();

      await variantFile.save(resizedBuffer, {
        metadata: { contentType: "image/webp" },
      });
      console.log(`    ${size.name} — created (${(resizedBuffer.length / 1024).toFixed(0)} KB)`);
      created++;
    }
  }

  console.log(`\n[${label}] Done. Created: ${created}, Skipped (already existed): ${skipped}`);
  return { created, skipped };
}

async function main() {
  let totalCreated = 0;
  let totalSkipped = 0;

  const configs = targetPrefix
    ? CONFIGS.filter(c => c.prefix === targetPrefix)
    : CONFIGS;

  if (configs.length === 0) {
    console.error(`Unknown prefix "${targetPrefix}". Use "products/" or "storefront/"`);
    process.exit(1);
  }

  for (const config of configs) {
    const result = await processPrefix(config);
    totalCreated += result.created;
    totalSkipped += result.skipped;
  }

  console.log(`\n==========\nAll done. Total created: ${totalCreated}, Total skipped: ${totalSkipped}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
