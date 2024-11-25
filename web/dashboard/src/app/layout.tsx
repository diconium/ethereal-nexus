import "./globals.css";
import React from "react";
import NewRelicSnippet from '@/components/newrelicSnippet';
import { ThemeProvider } from '@/components/theme-provider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const env = process.env.NODE_ENV

  return <html lang="en" suppressHydrationWarning>
    { env == "production" ? (
    <head>
        <NewRelicSnippet/>
    </head>): null}
    <body className="font-campton">
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
    </body>
    </html>;
}
