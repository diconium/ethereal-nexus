import "./globals.css";
import React from "react";
import { Inter } from "next/font/google";
import DashboardLayout from "@/components/layout";
import { ThemeProvider } from '@/components/theme-provider';
import NewRelicSnippet from '@/components/newrelicSnippet'

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const env = process.env.NODE_ENV

    return <html lang="en">
    { env == "production" ? (
    <head>
        <NewRelicSnippet/>
    </head>): null}
    <body className={inter.className}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
    </ThemeProvider>
    </body>
    </html>;
}
