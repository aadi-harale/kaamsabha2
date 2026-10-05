import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on styles is required: Leaflet sets inline `transform`/`position` on every
 * tile and pane as it pans, and the app uses inline style attributes for chart bar heights.
 * Removing it would break the maps, so it stays and is noted here rather than quietly dropped.
 *
 * Scripts are tighter. Next.js injects inline bootstrap scripts, so `'unsafe-inline'` is needed
 * for them too; a deployment that wants it removed has to adopt Next's nonce support, which is
 * worth doing before this carries real user data. `'unsafe-eval'` is allowed only in dev, where
 * React Refresh needs it.
 */
function contentSecurityPolicy(isDev: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // OpenStreetMap raster tiles, plus data/blob for Leaflet's generated markers.
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
    "font-src 'self' data:",
    // Same-origin API routes only; the browser never talks to OSRM or OpenRouter directly.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `next dev` otherwise appends its own block to AGENTS.md on every run, which turns the
  // project's own build standards into a permanently dirty file.
  agentRules: false,
  typedRoutes: true,
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The app asks for no device capabilities; worker positions are illustrative, not GPS.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
      {
        // Nothing under /api is cacheable: it is either a signed code, a live register read or
        // a provider call.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
