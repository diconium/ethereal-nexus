import React from "react";
import DashboardLayout from "@/components/layout";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const env = process.env.NODE_ENV

    return <DashboardLayout>{children}</DashboardLayout>;
}
