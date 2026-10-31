import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site 100% estático: os dados vêm de ../data/analytics/report.json no build.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
