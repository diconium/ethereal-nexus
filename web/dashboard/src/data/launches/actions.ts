'use server';

import { ActionResponse } from '@/data/action';
import { actionError, actionSuccess } from '@/data/utils';
import { Environment } from '@/data/projects/dto';

export async function launch(from: Environment, to: Environment, userId?: string): ActionResponse<{ id: string }> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    console.log('Launching', from, to)
    return actionSuccess({ id: '1234567890' });
  } catch (error) {
    return actionError('Failed to insert user into database.');
  }
}
