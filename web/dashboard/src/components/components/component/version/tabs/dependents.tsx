'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontalIcon } from 'lucide-react';
import { HomeIcon, PersonIcon } from '@radix-ui/react-icons';
import { ProjectWithOwners } from '@/data/projects/dto';
import Link from 'next/link';

interface PreviewProps {
  dependents: (ProjectWithOwners | null)[];
}

const Dependents: React.FC<PreviewProps> = ({ dependents = [] }) => {
  const hiddenDependents = dependents.filter(p => p === null);
  const accessibleDependents = dependents.filter(p => p !== null);

  return (
    <div className="grid gap-6">
      {dependents.length === 0 && (
        <span className="scroll-m-20 text-lg text-gray-500 mb-4">No dependent projects.</span>
      )}
      {accessibleDependents.length === 0 ?
        <span className="scroll-m-20 text-lg text-gray-500 mb-4">No access to the dependent projects.</span> :
        accessibleDependents
          .map((dependent) => (
            <Link key={dependent.id} href={`/projects/${dependent.id}`}>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <HomeIcon className="w-8 h-8" />
                  <div className="grid gap-1">
                    <CardTitle>{dependent.name}</CardTitle>
                    <CardDescription>{dependent.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="ml-auto" size="icon" variant="ghost">
                        <MoreHorizontalIcon className="w-4 h-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Project</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <div className="text-sm font-semibold">Project Maintainers:</div>
                    <div className="items-center gap-4 text-sm">
                      {dependent.owners.map(({ name }, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <PersonIcon className="w-4 h-4" />
                          <span className="text-gray-500 dark:text-gray-400">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
      }
      {hiddenDependents.length > 0 && (
        <span
          className="scroll-m-20 text-lg text-gray-500 mb-4">{hiddenDependents.length} other dependent projects.</span>
      )}
    </div>
  );
};

export default Dependents;
