import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sellri | Premium Social Commerce for Indian Entrepreneurs",
  description:
    "Transform your social media into a professional storefront. A simple link your buyers can browse and order from—instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist:wght@500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-on-surface selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
