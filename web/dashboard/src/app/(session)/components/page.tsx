import React from 'react';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { auth } from '@/auth';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/components/table/columns';
import { getComponents } from '@/data/components/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import process from 'node:process';

export default async function Components() {
  const session = await auth();
  const components = await getComponents();

  if (!components.success) {
    notFound();
  }

  return (
    <>
      <h1 className="text-4xl font-semibold">Components</h1>
      <p className="mb-10">Manage your components here</p>
      <DataTable
        columns={columns}
        data={components.data}
        entity="components"
        filterColumn={'name'}
        createSlot={
          !!process.env.OPENAI_API_KEY ?
            <Button asChild variant="outline" className="ml-auto border-0 relative overflow-hidden p-0.5" disabled={session?.user?.role === 'viewer'}>
              <Link
                href="/components/generate"
              >
                <span className="absolute inset-[-2000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#FE6630_0%,#D9508A_25%,#8F26D3_50%,#D9508A_75%,#FE6630_100%)]" />
                <span className="flex h-full w-full items-center justify-center rounded-full bg-background px-5 backdrop-blur-3xl">
                  <Sparkles className="h-5 w-5 mr-1" />
                  Generate component
                </span>
              </Link>
            </Button> :
            null
        }
      />
    </>
  );
}
