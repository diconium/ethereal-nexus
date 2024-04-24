import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { auth } from '@/auth';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import React from 'react';

export default async function Home() {
  const session = await auth();

  return (
    <div className="container">
      <article className="grid md:grid-cols-hero items-center">
        <div>
          <h2 className="text-5xl uppercase">
            Seamless Integration <b>Limitless Possibilities</b>
          </h2>
          <p className="text-2xl mt-5">
            Experience excellence with the use of our components that integrate effortlessly with your
            preferred CMS system, faster than you can blink.
          </p>
          <Link
            href="/projects/new"
            passHref
            className={cn(
              buttonVariants({
                variant: 'link',
                size: 'sm',
                className: 'text-orange-600 p-0 py-2 mt-10',
              }),
              session?.user?.role === 'viewer' && 'pointer-events-none opacity-50',
            )}
          >
            <span className="text-base font-bold"> Start a new project now</span>
          </Link>
        </div>
        <Image
          src="/hero-image.png"
          alt="Dashboard hero image"
          data-testid="dashboard-image"
          width={750}
          height={0}
        />
      </article>
    </div>
  );
}
