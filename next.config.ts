import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `next dev` otherwise appends its own block to AGENTS.md on every run, which turns the
  // project's own build standards into a permanently dirty file.
  agentRules: false,
  typedRoutes: true
};

export default nextConfig;
