import "./globals.css";
import { Poppins } from 'next/font/google'

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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </body>
  </html>;
}
