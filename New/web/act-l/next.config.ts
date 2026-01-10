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
};

export default nextConfig;
