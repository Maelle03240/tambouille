import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { AppProvider } from "@/components/app/AppProvider";
import { InstallHint } from "@/components/app/InstallHint";
import { ServiceWorker } from "@/components/app/ServiceWorker";
import { BRAND } from "@/config/brand";
import "./globals.css";

// Polices du thème : changer ici (et le nom de variable reste le même).
const heading = Caprasimo({ weight: "400", subsets: ["latin"], variable: "--font-heading-family" });
const body = Figtree({ weight: ["400", "500", "600", "700", "800"], subsets: ["latin"], variable: "--font-body-family" });

export const metadata: Metadata = {
  title: BRAND.shortName,
  description: BRAND.tagline,
  applicationName: BRAND.shortName,
  appleWebApp: { capable: true, title: BRAND.shortName, statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: BRAND.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${heading.variable} ${body.variable} antialiased`}>
      <body className="min-h-dvh">
        <AppProvider>{children}</AppProvider>
        <InstallHint />
        <ServiceWorker />
      </body>
    </html>
  );
}
