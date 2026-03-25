'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EnvironmentOption = {
  id: string;
  name: string;
};

type EnvironmentSwitcherProps = {
  environments: EnvironmentOption[];
  environmentId?: string;
};

export function EnvironmentSwitcher({
  environments,
  environmentId,
}: EnvironmentSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!environments.length) {
    return null;
  }

  const value = environmentId || environments[0].id;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('env', nextValue);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Select environment" />
      </SelectTrigger>
      <SelectContent>
        {environments.map((environment) => (
          <SelectItem key={environment.id} value={environment.id}>
            {environment.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
