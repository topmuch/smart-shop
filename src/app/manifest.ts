/**
 * Smart Shop - PWA Manifest
 * Progressive Web App configuration for offline-capable shopping assistant.
 */

export default function manifest() {
  return {
    name: "Smart Shop - Assistant Courses Intelligent",
    short_name: "Smart Shop",
    description:
      "Scannez vos courses, suivez votre budget en temps réel et générez vos tickets de caisse.",
    start_url: "/",
    display: "standalone" as const,
    background_color: "#ffffff",
    theme_color: "#22c55e",
    orientation: "any" as const,
    scope: "/",
    lang: "fr",
    dir: "ltr" as const,
    categories: ["shopping", "finance", "productivity"],
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    screenshots: [],
  };
}
