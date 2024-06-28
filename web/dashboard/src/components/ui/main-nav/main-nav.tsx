import { cn } from "@/lib/utils";
import { NavLink } from './nav-link';
import { auth } from '@/auth';
import ProjectsIcon from '@/components/ui/icons/ProjectsIcon';
import ComponentsIcon from '@/components/ui/icons/ComponentsIcon';
import ApiDocumentationIcon from '@/components/ui/icons/ApiDocumentationIcon';
import LogoImage from "@/components/ui/logo-image";
import { Users2 } from 'lucide-react';

export async function MainNav({className = "", ...props } : React.HTMLAttributes<HTMLElement>) {
  const session = await auth()

  return (
    <nav
      className={cn("flex items-center justify-between w-full", className)}
      {...props}
    >
      <div className="w-full flex items-center gap-9">
        <NavLink className='flex items-center justify-center' href="/">
          <LogoImage/>
        </NavLink>

        <NavLink className="flex items-center justify-center w-40" href="/projects">
          <div className="mr-4">
            <ProjectsIcon width={20} height={20} />
          </div>
          <span>Projects</span>
        </NavLink>

        <NavLink className="flex items-center justify-center w-44" href="/components">
          <div className="mr-4">
            <ComponentsIcon width={20} height={20} />
          </div>
          <span>Components</span>
        </NavLink>

        {session?.user?.role === 'admin' && (
          <NavLink className='flex items-center justify-center w-44'
                   href="/users">
            <div className="mr-4">
              <Users2 width={25} height={25} />
            </div>
            <span>Users</span></NavLink>
        )}

        <NavLink
          className='ml-auto flex items-center justify-center w-44'
          rel="noreferrer noopener"
          target="_blank"
          href="https://diconium.github.io/ethereal-nexus/"
        >
          <div className="mr-4">
            <ApiDocumentationIcon width={20} height={20} />
          </div>
          <span>Docs</span>
        </NavLink>

      </div>
    </nav>
  );
}
