import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";

import clsx from "clsx";
import "@/app/globals.css";
import { Header } from "./components/Header";

const noto_sans = Noto_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const noto_sans_mono = Noto_Sans_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-mono',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

// https://github.com/vercel/next.js/discussions/42881#discussioncomment-5952355
const materialSymbols = localFont({
  variable: '--font-family-symbols',
  style: 'normal',
  src: '../node_modules/material-symbols/material-symbols-rounded.woff2',
  display: 'block',
  weight: '600',
});

export const metadata: Metadata = {
  title: "let something = ",
  description: "A blog about something I'm in the process of defining",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={clsx(
      materialSymbols.variable,
      noto_sans.variable,
      noto_sans_mono.variable,
      'transition-colors'
    )}>
      <body className="font-sans bg-zinc-50">
        <Header />
        <main className="w-full flex justify-center">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
