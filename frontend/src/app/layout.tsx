import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pnapana - Your Green Family",
  description: "Plant care app",
};

import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MaintenanceGate from "@/components/MaintenanceGate";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <MaintenanceGate>
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                {children}
                <Footer />
              </main>
            </div>
          </MaintenanceGate>
        </LanguageProvider>
      </body>
    </html>
  );
}
