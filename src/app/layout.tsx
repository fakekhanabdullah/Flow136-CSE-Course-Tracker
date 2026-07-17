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
  title: "BRACU CSE Course Tracker & Planner",
  description: "An interactive, client-side course tracking and CGPA planning application engineered specifically for Computer Science and Engineering (CSE) students at BRAC University.",
  openGraph: {
    title: "BRACU CSE Course Tracker & Planner",
    description: "An interactive, client-side course tracking and CGPA planning application engineered specifically for Computer Science and Engineering (CSE) students at BRAC University.",
    type: "website",
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
