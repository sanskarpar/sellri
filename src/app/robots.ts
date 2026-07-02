import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/signin", "/settings", "/products", "/orders", "/storefront", "/api/"],
      },
    ],
    sitemap: "https://sellri.in/sitemap.xml",
  };
}
