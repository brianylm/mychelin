import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  async redirects() {
    return [
      { source: "/recipes", destination: "/app/recipes", permanent: true },
      { source: "/recipes/:path*", destination: "/app/recipes/:path*", permanent: true },
      { source: "/fridge", destination: "/app/fridge", permanent: true },
      { source: "/planner", destination: "/app/planner", permanent: true },
      { source: "/profile", destination: "/app/profile", permanent: true },
      { source: "/capture", destination: "/app/capture", permanent: true },
      { source: "/discover", destination: "/app/discover", permanent: true },
    ];
  },
};

export default nextConfig;
