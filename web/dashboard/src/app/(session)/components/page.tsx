import React from 'react';
import { notFound } from 'next/navigation';
import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/components/table/columns';
import { getComponents } from '@/data/components/actions';
import { buttonVariants } from "@/components/ui/button";

export default async function Components() {
  const session = await auth()
  const components = await getComponents();

  if (!components.success) {
    notFound();
  }

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Components</h2>
          <p className="text-muted-foreground">Manage your components here!</p>
        </div>
        <Link
          href="/components/generate"
          passHref
          className={cn(
              buttonVariants({
                  variant: 'outline',
                  className: 'transition-colors bg-orange-500 rounded-full text-white h-12 px-5 flex justify-center items-center',
              }),
              session?.user?.role === 'viewer' && 'pointer-events-none opacity-50',
          )}
        >
            <div className="mr-4">
                <Plus />
            </div>
          <span className="text-sm font-bold">Generate component</span>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={components.data}
        entity='components'
      />
    </div>
  );
}
