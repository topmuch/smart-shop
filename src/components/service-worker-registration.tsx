"use client";

import { useEffect } from "react";

/**
 * Service Worker Registration Component
 *
 * Registers the Smart Shop PWA service worker on the client side.
 * Uses @serwist/window for seamless integration with Serwist.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          console.log("[SW] Service Worker registered with scope:", registration.scope);

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "activated") {
                  console.log("[SW] New Service Worker activated");
                }
              });
            }
          });
        } catch (error) {
          console.error("[SW] Service Worker registration failed:", error);
        }
      });
    }
  }, []);

  return null;
}
