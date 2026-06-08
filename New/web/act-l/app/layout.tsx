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
      <body className="antialiased bg-zinc-950 font-mono">
        <UpdateBanner />
        {children}
      </body>
    </html>
  );
}
