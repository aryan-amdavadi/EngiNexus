import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EngiNexus | Engineering Resource Intelligence",
  description: "AI-Powered Engineering Resource Intelligence prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
