'use client';
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Package, Users, ExternalLink } from 'lucide-react';
import { ProjectWithOwners } from '@/data/projects/dto';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface PreviewProps {
  dependents: (ProjectWithOwners | null)[];
}

const Dependents: React.FC<PreviewProps> = ({ dependents = [] }) => {
  const hiddenDependents = dependents.filter((p) => p === null);
  const accessibleDependents = dependents.filter((p) => p !== null);

  if (dependents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">No dependent projects</p>
        <p className="text-sm text-muted-foreground/60">
          This component has no dependent projects
        </p>
      </div>
    );
  }

  if (accessibleDependents.length === 0 && hiddenDependents.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">
          No access to dependent projects
        </p>
        <p className="text-sm text-muted-foreground/60">
          You don&apos;t have permission to view the dependent projects
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {accessibleDependents.length > 0 && (
        <Badge variant="secondary">
          {accessibleDependents.length} dependent
          {accessibleDependents.length !== 1 ? 's' : ''}
        </Badge>
      )}

      <div className="flex flex-col gap-4">
        {accessibleDependents.map((dependent) => (
          <Link key={dependent.id} href={`/projects/${dependent.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 grid gap-1">
                  <CardTitle className="text-base">{dependent.name}</CardTitle>
                  {dependent.description && (
                    <CardDescription className="line-clamp-2">
                      {dependent.description}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.preventDefault()}
                  >
                    <Button size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Maintainers:</span>
                  <div className="flex -space-x-2">
                    {dependent.owners.slice(0, 3).map((owner, index) => (
                      <Avatar
                        key={index}
                        className="h-6 w-6 border-2 border-background"
                      >
                        <AvatarFallback className="text-xs">
                          {owner.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {dependent.owners.length > 3 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs border-2 border-background">
                        +{dependent.owners.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-muted-foreground/60">
                    ({dependent.owners.length}{' '}
                    {dependent.owners.length === 1 ? 'person' : 'people'})
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {hiddenDependents.length > 0 && (
        <div className="flex items-center gap-2 pt-4 border-t">
          <Badge variant="outline">{hiddenDependents.length} hidden</Badge>
          <span className="text-sm text-muted-foreground">
            other dependent project{hiddenDependents.length !== 1 ? 's' : ''}{' '}
            you don&apos;t have access to
          </span>
        </div>
      )}
    </div>
  );
};

export default Dependents;
