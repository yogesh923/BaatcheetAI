import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal standalone server for the Docker image.
  // (All API routes moved to the Express server, so no cross-root
  // tracing or server externals are needed anymore.)
  output: "standalone",
};

export default nextConfig;
