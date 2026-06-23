import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
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

