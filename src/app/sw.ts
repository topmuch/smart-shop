/**
 * Smart Shop - Service Worker
 *
 * Caching strategies:
 * - CacheFirst: static assets (CSS, JS, images, fonts) with 30-day expiry
 * - NetworkFirst: API calls (try network, fallback to cache)
 * - StaleWhileRevalidate: app shell (HTML pages)
 * - Cache name: smartshop-v1
 */

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
  Serwist,
  setCacheNameDetails,
} from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Set custom cache name prefix
setCacheNameDetails({
  prefix: "smartshop",
  suffix: "v1",
});

const serwist = new Serwist({
  precacheEntries: (self as unknown as WorkerGlobalScope).__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // StaleWhileRevalidate for app shell (navigation / HTML pages)
    {
      matcher: /^\/$/,
      handler: new StaleWhileRevalidate({
        cacheName: "smartshop-v1-shell",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
    // StaleWhileRevalidate for web manifest
    {
      matcher: /\/(manifest\.webmanifest|manifest\.json)$/,
      handler: new StaleWhileRevalidate({
        cacheName: "smartshop-v1-shell",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
    // CacheFirst for static JS/CSS assets (30-day expiry)
    {
      matcher: /\.(?:css|js)$/,
      handler: new CacheFirst({
        cacheName: "smartshop-v1-static",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // CacheFirst for images (30-day expiry)
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/,
      handler: new CacheFirst({
        cacheName: "smartshop-v1-images",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // CacheFirst for fonts (30-day expiry)
    {
      matcher: /\.(?:woff|woff2|ttf|otf|eot)$/,
      handler: new CacheFirst({
        cacheName: "smartshop-v1-fonts",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // NetworkFirst for API calls (try network, fallback to cache)
    {
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname.startsWith("/api/"),
      method: "GET",
      handler: new NetworkFirst({
        cacheName: "smartshop-v1-api",
        networkTimeoutSeconds: 10,
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
        ],
      }),
    },
    // Default Next.js caching (for _next/static, fonts, images, data, etc.)
    ...defaultCache,
  ],
});

serwist.addEventListeners();
