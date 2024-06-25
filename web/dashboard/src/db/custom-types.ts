import { customType } from 'drizzle-orm/pg-core';

/**
 * This is a workaround due to an open issue in the drizzle-orm library
 *  - https://github.com/drizzle-team/drizzle-orm/issues/724
 *
 *  jsonb objects are always saved as a json string.
 *  This custom type can be used to overcome that limitation.
 */
export const customJsonb = customType<{ data: unknown }>({
  dataType() {
    return 'jsonb';
  },
  toDriver(value) {
    return value;
  },
  fromDriver(value): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        console.warn('Failed to parse json - the default value will be used');
      }
    }
    return value;
  },
});
export const customJson = customType<{ data: unknown }>({
  dataType() {
    return 'json';
  },
  toDriver(value) {
    return value;
  },
  fromDriver(value): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        console.warn('Failed to parse json - the default value will be used');
      }
    }
    return value;
  },
});
