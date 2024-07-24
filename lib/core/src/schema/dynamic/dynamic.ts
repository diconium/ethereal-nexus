import {
  BaseSchema,
} from '../../types';

export interface DynamicZoneSchema extends BaseSchema {
  /**
   * The schema type.
   */
  readonly type: 'dynamic';
}

interface DynamicInput {
}

export function dynamic(input: DynamicInput): DynamicZoneSchema {

  return {
    type: 'dynamic',
    _parse() {
      return {
        type: 'dynamic',
      }
    },
    _primitive() {
      return 'json'
    },
    ...input
  };
}