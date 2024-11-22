import React from 'react';
import { notFound } from 'next/navigation';
import { Sparkles } from "lucide-react";
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

    const iconVariants = {
        animate: {
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
            transition: {
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop" as const
            }
        }
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
                      size: 'sm',
                      className: 'mr-2 transition-colors bg-orange-500 rounded-full text-white h-9 px-5 flex justify-center items-center',
                  }),
                  session?.user?.role === 'viewer' && 'pointer-events-none opacity-50',
              )}
            >
                <span className="animate-twinkle mr-4">
                    <Sparkles className="h-5 w-5"/>
                </span>
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
