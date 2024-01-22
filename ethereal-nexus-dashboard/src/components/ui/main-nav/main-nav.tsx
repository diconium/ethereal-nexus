import { cn } from "@/lib/utils";
import { NavLink } from './nav-link';

export function MainNav({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
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
        href="/users"
      >
        Users
      </NavLink>
      <NavLink
        href="/api-doc"
      >
        API Documentation
      </NavLink>
    </nav>
  );
}
