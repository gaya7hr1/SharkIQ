import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SharkIQ — AI Venture Capital Intelligence Platform",
  description: "Multi-agent AI due diligence for venture capital investment decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
