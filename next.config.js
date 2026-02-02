/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const withPWA = isProduction
  ? require("next-pwa")({
      dest: "public",
      register: true,
      skipWaiting: false,
      disable: false,
    })
  : (config) => config;

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Production: allow only listed domains
    domains: ["pawansuthar.in", "another-allowed-domain.com"],

    // Development: allow all remote images using remotePatterns
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["http://localhost:3000"],
    },
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = withPWA(nextConfig);
