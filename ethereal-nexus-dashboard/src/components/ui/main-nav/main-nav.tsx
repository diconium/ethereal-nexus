import { cn } from "@/lib/utils";
import { NavLink } from './nav-link';
import { auth } from '@/auth';

export async function MainNav({
                                className = "",
                                ...props
                              }: React.HTMLAttributes<HTMLElement>) {
  const session = await auth()

  return (
    <nav
      className={cn("flex items-center justify-between pl-4 pr-4 w-full", className)}
      {...props}
    >
      <div className="flex items-center space-x-4 lg:space-x-6">
        <NavLink
          href="/"
        >
          Home
        </NavLink>
        <NavLink
          href="/projects"
        >
          Projects
        </NavLink>
        <NavLink
          href="/components"
        >
          Components
        </NavLink>
        {session?.user?.role === 'admin' ? (
          <NavLink
            href="/users"
          >
            Users
          </NavLink>
        ) : null}
      </div>

      <div className="flex items-center">
        <span className="mr-4">
         {/* Add the desired space between Components and Documentation */}
        </span>
        <NavLink
          rel="noreferrer noopener"
          target="_blank"
          href="https://diconium.github.io/ethereal-nexus/"
        >
          Documentation
        </NavLink>
      </div>
    </nav>
);
}
