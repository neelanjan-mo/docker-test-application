import type { NextConfig } from "next";

const isDockerBuild = process.env.BUILD_IN_DOCKER === "1";

const nextConfig: NextConfig = {
  // Only enable standalone output for Docker/CI builds
  ...(isDockerBuild ? { output: "standalone" } : {}),
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
