import type { NextConfig } from "next";
import { securityHeaderRules } from "./lib/security-headers.ts";

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
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `next dev` otherwise appends its own block to AGENTS.md on every run, which turns the
  // project's own build standards into a permanently dirty file.
  agentRules: false,
  typedRoutes: true,
  async headers() {
    return securityHeaderRules(process.env.NODE_ENV !== "production");
  },
};

export default nextConfig;
