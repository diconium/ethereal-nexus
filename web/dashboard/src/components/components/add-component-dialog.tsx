'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export function AddComponentDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Plus data-icon="inline-start" />
          Add component
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a component</DialogTitle>
          <DialogDescription>
            Use the Ethereal Nexus CLI to publish components from your frontend
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <p className="font-medium">1. Install the CLI globally</p>
            <pre className="rounded-md bg-muted px-4 py-3 font-mono text-sm">
              npm install -g ethereal-nexus-cli
            </pre>
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-medium">
              2. Create{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                remote-components.config.json
              </code>{' '}
              in your project root
            </p>
            <pre className="rounded-md bg-muted px-4 py-3 font-mono text-sm whitespace-pre-wrap break-all">
              {`{
  "url": "${typeof window !== 'undefined' ? window.location.origin : ''}",
  "authorization": "apikey REPLACE_WITH_YOUR_API_KEY"
}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              You can generate an API key from the{' '}
              <span className="font-medium">Account</span> page.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-medium">3. Publish your components</p>
            <pre className="rounded-md bg-muted px-4 py-3 font-mono text-sm">
              ethereal-nexus-cli publish
            </pre>
          </div>

          <a
            href="https://www.npmjs.com/package/@ethereal-nexus/cli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            View CLI package on npm →
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
