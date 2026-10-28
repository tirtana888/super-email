import "./globals.css";

import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ThemeProvider } from "@usesend/ui";
import { Toaster } from "@usesend/ui/src/toaster";

import { TRPCReactProvider } from "~/trpc/react";
import { Metadata } from "next";

// IBM Plex: a corporate family with tabular figures that line up in tables.
// The variables are read by --font-sans / --font-mono in packages/ui globals.css.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
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
