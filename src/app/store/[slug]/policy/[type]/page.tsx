"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/sections/FooterSection";
import useGoogleFont from "@/hooks/useGoogleFont";
import { POLICY_LABELS, POLICY_DEFAULTS, fillPolicyTemplate, type PolicyType } from "@/lib/policyTemplates";

const VALID_TYPES: PolicyType[] = ["privacy", "terms", "refunds"];

export default function PolicyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const type = params.type as string;

  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useGoogleFont(seller?.storefront?.theme?.font || "");

  useEffect(() => {
    if (!slug || !type) return;
    if (!VALID_TYPES.includes(type as PolicyType)) { setLoading(false); return; }

    (async () => {
      const userQuery = query(collection(db, "users"), where("slug", "==", slug), limit(1));
      const userSnap = await getDocs(userQuery);
      if (userSnap.empty) { setLoading(false); return; }
      const data = userSnap.docs[0].data() as any;
      setSeller({ id: userSnap.docs[0].id, ...data });
      setLoading(false);
    })();
  }, [slug, type]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!seller || !VALID_TYPES.includes(type as PolicyType)) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <p className="text-on-surface-variant">Page not found</p>
        </div>
      </>
    );
  }

  const storefront = seller.storefront || {};
  const navbarConfig = storefront.navbar || {};
  const footerConfig = storefront.footer || {};
  const theme = storefront.theme || {};
  const primaryColor = theme.primaryColor || "#ff6b35";
  const pageFont = theme.font || "";

  const rawContent = storefront.policies?.[type]?.content || "";
  const content = rawContent || fillPolicyTemplate(
    POLICY_DEFAULTS[type as PolicyType],
    seller.name || "My Store",
    seller.whatsapp ? `+91 ${seller.whatsapp}` : seller.email || "",
    seller.whatsapp || "",
  );

  return (
    <div style={pageFont ? {
      fontFamily: `"${pageFont}", serif`,
      "--font-label-md": `"${pageFont}", serif`,
      "--font-body-md": `"${pageFont}", serif`,
      "--font-body-lg": `"${pageFont}", serif`,
      "--font-display-lg": `"${pageFont}", serif`,
      "--font-headline-md": `"${pageFont}", serif`,
      "--font-label-sm": `"${pageFont}", serif`,
      "--font-headline-lg": `"${pageFont}", serif`,
      "--font-headline-lg-mobile": `"${pageFont}", serif`,
    } as React.CSSProperties : undefined}>
      <Navbar
        storefrontNavbar={{
          bgColor: navbarConfig.bgColor || "#f68f1d",
          bgImage: navbarConfig.bgImage || "",
          logoURL: navbarConfig.logoURL || "",
          logoHeight: navbarConfig.logoHeight ?? 36,
          logoText: navbarConfig.logoText || "",
          logoFont: navbarConfig.logoFont || "Arial",
          logoTextColor: navbarConfig.logoTextColor || "#ffffff",
        }}
      />
      <main className="min-h-screen" style={{ backgroundColor: "#ffffff", "--color-primary": primaryColor } as React.CSSProperties}>
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-8">
            {POLICY_LABELS[type as PolicyType]}
          </h1>
          <div className="prose prose-slate max-w-none">
            {content.split("\n\n").map((block: string, i: number) => {
              const lines = block.split("\n");
              const heading = lines[0].trim();
              const body = lines.slice(1).join("\n").trim();

              if (!body) {
                if (heading.startsWith("- ")) {
                  return (
                    <ul key={i} className="list-disc pl-6 mb-4 text-on-surface space-y-1">
                      {lines.filter((l: string) => l.trim()).map((line: string, j: number) => (
                        <li key={j}>{line.replace(/^- /, "")}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={i} className="mb-4 text-on-surface leading-relaxed">{heading}</p>;
              }

              return (
                <div key={i} className="mb-6">
                  <h2 className="text-xl font-semibold text-on-surface mb-2">{heading}</h2>
                  {body.startsWith("- ") ? (
                    <ul className="list-disc pl-6 text-on-surface space-y-1">
                      {body.split("\n").filter((l: string) => l.trim()).map((line: string, j: number) => (
                        <li key={j}>{line.replace(/^- /, "")}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-on-surface leading-relaxed">{body}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <FooterSection
        storeName={footerConfig.storeName || "My Store"}
        logo={footerConfig.logo || ""}
        instagram={footerConfig.instagram || ""}
        whatsapp={footerConfig.whatsapp || ""}
        facebook={footerConfig.facebook || ""}
        copyright={footerConfig.copyright || ""}
        bgColor={footerConfig.bgColor || ""}
        bgGradient={footerConfig.bgGradient || ""}
        bgImage={footerConfig.bgImage || ""}
        trackUrl="/track"
        phone={footerConfig.phone || ""}
        email={footerConfig.email || ""}
        address={footerConfig.address || ""}
      />
    </div>
  );
}
