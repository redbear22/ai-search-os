import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow _next/* assets when the page is opened via LAN IP or 127.0.0.1 (not only "localhost").
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.2.71"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  productionBrowserSourceMaps: false,
  webpack(config, { dev }) {
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/python/:path*",
        destination: "http://localhost:8502/:path*",
      },
    ];
  },
};

export default nextConfig;
