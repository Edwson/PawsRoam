import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Layout from "@/components/Layout";
import AppProviders from "@/components/AppProviders"; // Import AppProviders

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PawsRoam",
  description: "The Ultimate Pet-Friendly Ecosystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProviders> {/* Wrap Layout and children with AppProviders */}
          <Layout>
            {children}
          </Layout>
        </AppProviders>
      </body>
    </html>
  );
}
