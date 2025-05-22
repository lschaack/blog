import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "@/app/globals.css";
import { Header } from "./components/Header";

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
    <html lang="en">
      <body className="font-test bg-zinc-50">
        <Header />
        <main className="w-full flex justify-center">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
