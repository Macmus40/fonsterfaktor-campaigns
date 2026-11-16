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
  title: "FönsterFaktor Campaigns",
  description:
    "Internal panel for creating, publishing, and analyzing Drutex product campaigns in Sweden",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-50 text-stone-900`}
      >
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                FönsterFaktor
              </p>
              <h1 className="text-lg font-semibold">Campaigns</h1>
            </div>
            <nav className="flex gap-4 text-sm text-stone-600">
              <a className="hover:text-stone-900" href="/">
                Översikt
              </a>
              <a className="hover:text-stone-900" href="/campaigns">
                Kampanjer
              </a>
              <a className="hover:text-stone-900" href="/publications">
                Publikationer
              </a>
              <a className="hover:text-stone-900" href="/docs-hint">
                Kontrakt
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
