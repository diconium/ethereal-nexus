import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { WebVitalsProvider } from '@/components/web-vitals-provider';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head></head>
      <body className="font-sans antialiased">
        <WebVitalsProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </WebVitalsProvider>
      </body>
    </html>
  );
}
