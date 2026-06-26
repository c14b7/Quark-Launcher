import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const appDir = resolve(__dirname);

const pkg = JSON.parse(readFileSync(join(appDir, "package.json"), "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Jawny root — tailwind/postcss muszą resolve'ować z web/act-l/node_modules
  turbopack: {
    root: appDir,
  },
  outputFileTracingRoot: appDir,
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
              "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https://api.fontshare.com https://cdn.fontshare.com",
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

