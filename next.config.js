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

  // Performance optimizations
  compress: isProduction, // Enable gzip compression in production
  poweredByHeader: false, // Remove X-Powered-By header for security

  // Server timeout for long-running API requests
  serverRuntimeConfig: {
    // Increase server timeout for heavy operations (in milliseconds)
    requestTimeout: 60000, // 60 seconds
  },

  images: {
    // Production: allow only listed domains
    domains: ["rozgarpay.in", "another-allowed-domain.com"],

    // Development: allow all remote images using remotePatterns
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],

    // Performance: optimize images
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["http://localhost:3000"],
    },
  },

  // Optimize production builds
  swcMinify: isProduction,

  // Enable webpack optimizations
  webpack: (config, { isServer }) => {
    // Enable persistent caching for faster rebuilds
    if (!isServer) {
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = withPWA(nextConfig);
