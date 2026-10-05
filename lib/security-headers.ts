// Local HTTP demos must not upgrade their own scripts to a TLS server that does not exist.
// Anchor the entire Host header so a public hostname containing a private address cannot opt out.
const octet = "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])";
export const LOCAL_HTTP_HOST_PATTERN = `(?:localhost|127\\.${octet}\\.${octet}\\.${octet}|0\\.0\\.0\\.0|10\\.${octet}\\.${octet}\\.${octet}|172\\.(?:1[6-9]|2[0-9]|3[01])\\.${octet}\\.${octet}|192\\.168\\.${octet}\\.${octet}|\\[::1\\])(?::[0-9]+)?`;

/** Leaflet/chart styles and Next's bootstrap need inline sources; eval stays dev-only. */
function contentSecurityPolicy(isDev: boolean, enforceHttps = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
    "font-src 'self' data:",
    // Provider calls stay behind same-origin APIs; maps use HTTPS tile providers.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "form-action 'self'", "frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'",
    ...(enforceHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function securityHeaderRules(isDev: boolean) {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Worker positions are illustrative; no device permissions are requested.
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    },
    // Next applies this later rule only to public production hosts. Local/LAN production
    // previews keep all other CSP restrictions while continuing to work over plain HTTP.
    ...(!isDev ? [{
      source: "/:path*",
      missing: [{ type: "header" as const, key: "host", value: LOCAL_HTTP_HOST_PATTERN }],
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy(false, true) },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }] : []),
    { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
  ];
}
