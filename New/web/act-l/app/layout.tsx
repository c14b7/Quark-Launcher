import type { Metadata } from "next";
import UpdateBanner from "../components/update/baner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quark",
  description: "Ultra-modern game launcher",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=array@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-black font-mono">
        {/* Instant splash before React hydrates (Electron startup) */}
        <div id="quark-splash" className="quark-splash-screen fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden">
          <div className="quark-aurora" aria-hidden>
            <div className="quark-aurora-layer quark-aurora-layer-1" />
            <div className="quark-aurora-layer quark-aurora-layer-2" />
            <div className="quark-aurora-layer quark-aurora-layer-3" />
            <div className="quark-aurora-layer quark-aurora-layer-4" />
            <div className="quark-aurora-layer quark-aurora-layer-5" />
            <div className="quark-aurora-vignette" />
          </div>
          <div className="quark-splash-brand">
            <h1 className="font-logo quark-splash-title">Quark</h1>
            <div className="quark-splash-spinner" role="status" aria-label="Loading" />
          </div>
        </div>
        <UpdateBanner />
        {children}
      </body>
    </html>
  );
}
