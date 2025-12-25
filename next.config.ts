import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ==========================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ==========================================================================
  
  // Enable React strict mode for catching issues early
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fmglwxfgognptuiyfkzn.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports - tree shake large packages
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
    ],
    // Turbopack file system caching for faster builds
    turbopackFileSystemCacheForBuild: true,
  },
  
  // Compress responses
  compress: true,
  
  // Generate ETags for caching
  generateEtags: true,
  
  // ==========================================================================
  // SECURITY HEADERS
  // ==========================================================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy (disable unnecessary APIs)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // ==========================================================================
  // REDIRECTS (if needed)
  // ==========================================================================
  async redirects() {
    return [
      // Redirect www to non-www (or vice versa) - configure based on preference
      // {
      //   source: '/:path*',
      //   has: [{ type: 'host', value: 'www.popndroprentals.com' }],
      //   destination: 'https://popndroprentals.com/:path*',
      //   permanent: true,
      // },
    ];
  },
};

export default nextConfig;
