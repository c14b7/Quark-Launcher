import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quark Launcher",
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
        {children}
      </body>
    </html>
  );
}
