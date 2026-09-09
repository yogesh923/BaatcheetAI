import type { NextConfig } from "next";

// Same-origin API passthrough: the browser only ever talks to the UI
// origin, so the session cookie stays first-party and the proxy/API both
// see it. (Cross-domain cookies were silently dropped, stranding logins.)
const API_BASE = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(
  /\/+$/,
  ""
);

const nextConfig: NextConfig = {
  // Standalone server ONLY for the Docker image (web/Dockerfile sets
  // DOCKER_BUILD=1). Vercel uses its default output — standalone + the old
  // cross-root tracing hack break its build (ENOENT next-server.js.nft.json).
  ...(process.env.DOCKER_BUILD ? { output: "standalone" as const } : {}),
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_BASE}/api/:path*` }];
  },
};

export default nextConfig;
