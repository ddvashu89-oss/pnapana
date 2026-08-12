import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pnapana - Your Green Family",
  description: "Plant care app",
};

import TopNav from "@/components/TopNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
