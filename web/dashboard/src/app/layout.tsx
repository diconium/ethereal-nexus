import "./globals.css";
import React from "react";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const env = process.env.NODE_ENV

  return <html lang="en" suppressHydrationWarning>
    <head>
    </head>
    <body className="font-campton">
    {children}
    </body>
    </html>;
}
