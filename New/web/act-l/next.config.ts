import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Upewnij się, że assetPrefix działa zarówno w dev jak i prod
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  basePath: '',
  // Konfiguracja CSP dla Electrona (permisywna, ale bezpieczniejsza)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval wymagany dla Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: http: ws: wss:",
              "media-src 'self' https: http:",
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

