import "./globals.css";
import React from "react";
import { Inter } from "next/font/google";
import DashboardLayout from "@/components/layout";
import { ThemeProvider } from '@/components/theme-provider';
import { auth } from '@auth';

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DashboardLayout>{children}</DashboardLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
