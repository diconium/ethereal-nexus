import { db } from '@/db';
import { resources } from "@/data/resources/schema";
import {  actionSuccess, actionError } from "@/data/utils";
import { ActionResponse } from '@/data/action';
import { Resource } from '@/data/resources/dto';

interface NewResource {
  type: string;
  resource_id: string;
}

export async function insertResource(newResource: NewResource): ActionResponse<Resource> {
  try {
    const insert = await db
      .insert(resources)
      .values(newResource)
      .returning();

    return actionSuccess(insert[0]);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert new resource into database.');
  }
}