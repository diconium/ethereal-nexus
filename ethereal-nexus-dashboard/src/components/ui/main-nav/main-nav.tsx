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
      className={cn("flex items-center space-x-4 lg:space-x-6 pl-4", className)}
      {...props}
    >
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
      <NavLink
        href="/api-doc"
      >
        API Documentation
      </NavLink>
      {session?.user?.role === 'admin' ? (
        <NavLink
          href="/users"
        >
          Users
        </NavLink>
      ) : null}
    </nav>
  );
}
