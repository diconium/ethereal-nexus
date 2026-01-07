import "./globals.css";
import { Poppins } from 'next/font/google'
import { WebVitalsProvider } from "@/components/web-vitals-provider";

const poppins = Poppins({
  weight: ['600', '400'],
  subsets: ['latin'],
})

import React from "react";
import { ThemeProvider } from '@/components/theme-provider';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={poppins.className} suppressHydrationWarning>
    <head>
    </head>
    <body>
    <WebVitalsProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </WebVitalsProvider>
    </body>
  </html>;
}
