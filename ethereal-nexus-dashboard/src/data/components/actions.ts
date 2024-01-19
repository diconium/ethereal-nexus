import { Result } from '@/data/action';
import { z } from 'zod';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { db } from '@/db';
import console from 'console';
import { componentsWithVersions } from './dto';

export async function getComponents(): Promise<Result<z.infer<typeof componentsWithVersions>[]>> {
try {
    const select = await db.query.components
      .findMany({
        with: {
          versions: true
        }
      });

    const safe = z.array(componentsWithVersions).safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the components records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch components from database.');
  }
}
