import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flow136 | BRACU CSE Curriculum & CGPA Planner",
  description: "Your curriculum, minus the complexity. Map out your 136-credit BRACU CSE degree cleanly and offline with Flow136.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Flow136",
    description: "Your curriculum, minus the complexity. Map out your 136-credit BRACU CSE degree cleanly and offline with Flow136.",
    type: "website",
    siteName: "Flow136",
  },
  verification: {
    google: "IPWUw60VNgRfSKJlcp8Z8I1NnAxnc1U3SEoQehG5UGE",
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
      className="h-full antialiased"
    >
      <head>
        <meta name="google-site-verification" content="IPWUw60VNgRfSKJlcp8Z8I1NnAxnc1U3SEoQehG5UGE" />
      </head>
      <body className="min-h-full flex flex-col font-sans text-zinc-200 bg-[#030303]">{children}</body>
    </html>
  );
}
