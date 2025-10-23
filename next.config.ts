import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Force cache invalidation: 2025-01-23

  webpack: (config, { isServer, dev }) => {
    // Disable webpack cache in production to avoid weird build errors
    if (!dev) {
      config.cache = false;
    }

    // Don't process mediabunny on the server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('mediabunny');
    }
    
    // Disable WASM warnings
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    // Enable async WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    return config;
  },

  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
