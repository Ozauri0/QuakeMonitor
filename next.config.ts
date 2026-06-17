import type { NextConfig } from "next";

const allowedOrigins = Array.from({ length: 254 }, (_, i) => `192.168.100.${i + 1}`);

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
  output: 'standalone',
};

export default nextConfig;
