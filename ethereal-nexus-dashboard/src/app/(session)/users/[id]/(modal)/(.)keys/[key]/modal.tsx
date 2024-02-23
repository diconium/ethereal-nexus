'use client'

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { ApiKeyForm } from "@/components/user/api-key-table/api-key-form";
import { Separator } from "@/components/ui/separator";

export default function ApiKeyModal({projects, apyKey}) {
  const router = useRouter();

  return <Dialog open={true} onOpenChange={router.back}>
    <DialogContent className="gap-0 p-0 px-4 outline-none">
      <DialogHeader className="pb-4 pt-5">
        <DialogTitle>Edit Key</DialogTitle>
        <DialogDescription>
          Edit the API Key for your user. The key value will not be displayed again, but you can edit it&apos;s permissions.
        </DialogDescription>
      </DialogHeader>
      <Separator className="mb-4" />
      <ApiKeyForm apyKey={apyKey} onComplete={router.back} availableProjects={projects} />
    </DialogContent>
  </Dialog>
}
