import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server ONLY for the Docker image (web/Dockerfile sets
  // DOCKER_BUILD=1). Vercel uses its default output — standalone + the old
  // cross-root tracing hack break its build (ENOENT next-server.js.nft.json).
  ...(process.env.DOCKER_BUILD ? { output: "standalone" as const } : {}),
};

export default nextConfig;
