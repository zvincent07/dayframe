import type { NextConfig } from "next";
import "./src/lib/env"; // Validate env on build

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/user/ai-insight/history",
        destination: "/user/dashboard",
        permanent: false,
      },
      {
        source: "/user/workout/history",
        destination: "/user/workout",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: (() => {
      const hosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "").split(",").map((h) => h.trim()).filter(Boolean);
      if (hosts.length > 0) {
        return hosts.map((hostname) => ({ protocol: "https" as const, hostname }));
      }
      return [
        { protocol: "https", hostname: "images.unsplash.com" },
        { protocol: "https", hostname: "cdn.pixabay.com" },
        { protocol: "https", hostname: "staticflickr.com" },
        { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons/**" },
      ];
    })(),
    unoptimized: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    workerThreads: false,
    cpus: 4,
  },
};

export default nextConfig;
