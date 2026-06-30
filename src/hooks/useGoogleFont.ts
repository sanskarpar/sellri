"use client";

import { useEffect } from "react";

const GOOGLE_FONTS = ["Playfair Display", "Poppins", "Montserrat", "Lobster", "Pacifico", "Dancing Script", "Bebas Neue"];

export default function useGoogleFont(fontName: string) {
  useEffect(() => {
    if (GOOGLE_FONTS.includes(fontName)) {
      const id = `gf-${fontName.replace(/\s+/g, "-")}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@400;700&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [fontName]);
}

export { GOOGLE_FONTS };
