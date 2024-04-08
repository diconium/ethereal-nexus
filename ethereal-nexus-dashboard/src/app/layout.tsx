import "./globals.css";
import React from "react";
import NewRelicSnippet from '@/components/newrelicSnippet';

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
    {children}
    </body>
    </html>;
}
