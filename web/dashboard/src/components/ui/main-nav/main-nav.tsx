import { cn } from "@/lib/utils";
import { NavLink } from './nav-link';
import { auth } from '@/auth';
import ProjectsIcon from '@/components/ui/icons/ProjectsIcon';
import ComponentsIcon from '@/components/ui/icons/ComponentsIcon';
import ApiDocumentationIcon from '@/components/ui/icons/ApiDocumentationIcon';
import LogoImage from "@/components/ui/logo-image";

export async function MainNav({className = "", ...props } : React.HTMLAttributes<HTMLElement>) {
  const session = await auth()

  return (
    <nav
      className={cn("flex items-center justify-between w-full", className)}
      {...props}
    >
      <div className="flex items-center space-x-4 lg:space-x-9">
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

        <NavLink
          className='flex items-center justify-center w-44'
          rel="noreferrer noopener"
          target="_blank"
          href="https://diconium.github.io/ethereal-nexus/"
        >
          <div className="mr-4">
            <ApiDocumentationIcon width={20} height={20} />
          </div>
          <span>Documentation</span>
        </NavLink>

        {session?.user?.role === 'admin' && (
          <NavLink href="/users">Users</NavLink>
        )}
      </div>
    </nav>
  );
}
