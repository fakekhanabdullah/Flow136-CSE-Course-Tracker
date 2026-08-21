import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flow136 | BRACU CSE Curriculum & CGPA Planner",
  description: "Your curriculum, minus the complexity. Map out your 136-credit BRACU CSE degree cleanly and offline with Flow136.",
  icons: {
    icon: "/icon.svg",
  },
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
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans text-zinc-200 bg-[#030303]">{children}</body>
    </html>
  );
}
