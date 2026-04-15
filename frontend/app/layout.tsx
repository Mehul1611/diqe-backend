import type { Metadata } from "next";
import Link from "next/link";
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
  title: "DIQE",
  description: "Query your documents with retrieval-augmented generation.",
  other: {
    copyright: "© 2026 Mehul Sharma. All rights reserved.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh flex flex-col`}
      >
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
        <footer
          className="shrink-0 border-t border-slate-800/70 bg-slate-950/90 py-3 px-4 text-center text-[11px] leading-relaxed text-slate-500 backdrop-blur-sm"
          role="contentinfo"
        >
          <span className="text-slate-400">© 2026 Mehul Sharma.</span> All rights reserved.
          Unauthorized use, copying, modification, or distribution is prohibited.{" "}
          <Link
            href="/LICENSE.txt"
            className="text-emerald-600/90 underline-offset-2 hover:text-emerald-400 hover:underline"
          >
            License terms
          </Link>
        </footer>
      </body>
    </html>
  );
}
