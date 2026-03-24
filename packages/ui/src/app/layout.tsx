import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
// import NetworkStatusBanner from "@/components/NetworkStatusBanner";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Stellar Explain",
  description: "Plain-English explanations for Stellar blockchain operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexMono.variable} ${ibmPlexSans.variable} antialiased`}
        suppressHydrationWarning
      >
        {" "}
        {/* <NetworkStatusBanner /> */}
        {children}
      </body>
    </html>
  );
}
