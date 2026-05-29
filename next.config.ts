import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Wskazujemy Turbopackowi root projektu — workaround dla rayon panic
  // który występuje gdy Next znajduje wiele lockfiles i nie wie który wybrać.
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/w/:slug*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      {
        source: "/embed/:slug*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
