import { insertEvent } from '@/data/events/actions';
import { NewEvent } from '@/data/events/dto';
import { logger } from '@/lib/logger';

export const logEvent = async (newEvent: NewEvent) => {
  logger.debug('Processing event for insertion', {
    operation: 'event-logging',
    eventType: newEvent.type,
    resourceId: newEvent.resource_id,
    userId: newEvent.user_id,
    hasData: !!newEvent.data,
  });
  await insertEvent(newEvent);
};
