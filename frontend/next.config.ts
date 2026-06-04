import type { NextConfig } from "next";

function getCanonicalUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? "https://comiu.link";

  try {
    return new URL(value);
  } catch {
    return new URL("https://comiu.link");
  }
}

function getApiUrl() {
  const value =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "https://comiu.up.railway.app";

  return value.replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'comiu.up.railway.app' },
      { protocol: 'https', hostname: '*.line-scdn.net' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'http', hostname: 'localhost', port: '3001' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3001' },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    if (process.env.CANONICAL_REDIRECT_ENABLED !== "true") return [];

    const canonical = getCanonicalUrl();
    if (!canonical || canonical.hostname === "comiu.vercel.app") return [];

    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "comiu.vercel.app" }],
        destination: `${canonical.origin}/:path*`,
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/backend/:path*",
          destination: `${getApiUrl()}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
