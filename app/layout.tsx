import "@/app/globals.css";

import type { Metadata } from "next";
import { Geist_Mono, Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import clsx from 'clsx';

import { Header } from "@/app/components/Header";

export const metadata: Metadata = {
  title: "let something = ",
  description: "A blog about something I'm in the process of defining",
};

const lato = Lato({
  variable: '--font-lato',
  weight: ['300', '400', '700'],
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={clsx(
        geistMono.variable,
        lato.variable,
        'bg-stone-50/30 text-stone-800 font-lato',
        'bg-[url(/mesa-background-downsampled.jpg)] bg-cover bg-center bg-fixed backdrop-blur-3xl',
        'min-h-screen overflow-x-hidden pb-8',
      )}>
        <Header />
        <main className="w-full flex justify-center">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
