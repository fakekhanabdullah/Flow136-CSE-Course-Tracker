import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flow136 | BRACU CSE Curriculum & CGPA Planner",
  description: "Your curriculum, minus the complexity. Map out your 136-credit BRACU CSE degree cleanly and offline with Flow136.",
  openGraph: {
    title: "Flow136",
    description: "Your curriculum, minus the complexity. Map out your 136-credit BRACU CSE degree cleanly and offline with Flow136.",
    type: "website",
    siteName: "Flow136",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
