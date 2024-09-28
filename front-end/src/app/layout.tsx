import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import Providers from "@/components/Providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Chain Review",
  description: "A review platform for the blockchain ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("bg-white text-slate-900 light")}>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen pt-12 bg-slate-50  antialiased`}>
        <Providers>
          <Navbar />
          <div className="container max-w-7xl mx-auto h-full pt-12">{children}</div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
