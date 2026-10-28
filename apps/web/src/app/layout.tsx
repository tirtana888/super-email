import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@usesend/ui";
import { Toaster } from "@usesend/ui/src/toaster";

import { TRPCReactProvider } from "~/trpc/react";
import { Metadata } from "next";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
        className={`font-sans ${geist.variable} ${geistMono.variable} app bg-sidebar-background`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster />
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
