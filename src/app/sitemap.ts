import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sellri.in";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/choose-plan`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/track`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/policies`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/policies/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/policies/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/policies/refund`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/policies/acceptable-use`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
