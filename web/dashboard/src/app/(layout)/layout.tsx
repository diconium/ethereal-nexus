import React from "react";
import DashboardLayout from "@/components/layout";
import { ThemeProvider } from '@/components/theme-provider';

export default async function RootLayout({
                                           children,
                                         }: {
  children: React.ReactNode;
}) {
  const env = process.env.NODE_ENV

  return  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <DashboardLayout>{children}</DashboardLayout>    </ThemeProvider>;
}
