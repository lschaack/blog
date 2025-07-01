import "@/app/globals.css";

import type { Metadata } from "next";
import { Geist_Mono, Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import clsx from 'clsx';

import { Header } from "@/app/components/Header";
import { DebugProvider } from "@/app/components/DebugContext";
import { DebugSurface } from "@/app/components/DebugSurface";

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
    <html
      lang="en"
      className="scroll-smooth"
    //style={{
    //  scrollbarGutter: 'stable',
    //}}
    >
      <body
        className={clsx(
          geistMono.variable,
          lato.variable,
          'text-stone-800 font-lato bg-mesa-shadow min-h-screen pb-8',
        )}
      >
        <DebugSurface />
        <DebugProvider>
          <Header />
          <main className="w-full flex justify-center">
            {children}
          </main>
        </DebugProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
