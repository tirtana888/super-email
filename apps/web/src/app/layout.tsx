import "./globals.css";

import localFont from "next/font/local";
import { ThemeProvider } from "@usesend/ui";
import { Toaster } from "@usesend/ui/src/toaster";

import { TRPCReactProvider } from "~/trpc/react";
import { Metadata } from "next";

// IBM Plex: a corporate family with tabular figures that line up in tables.
// Self-hosted (src/fonts, SIL OFL) so the build never fetches from Google Fonts.
// The variables are read by --font-sans / --font-mono in packages/ui globals.css.
const plexSans = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const plexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "F14 - Send Email Like a Jet",
  description: "Send email like a jet. Email API for developers in Indonesia.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-sidebar-background">
      <body
        className={`font-sans ${plexSans.variable} ${plexMono.variable} app bg-sidebar-background`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster />
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
