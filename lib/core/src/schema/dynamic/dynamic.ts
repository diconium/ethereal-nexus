import {
  BaseSchema,
} from '../../types';

export interface DynamicZoneSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'dynamic';
}

interface DynamicInput {
}

export function dynamic(input: DynamicInput): DynamicZoneSchema {
  return {
    type: 'dynamic',
    _parse() {
      return {
        type: 'dynamic',
      };
    },
    _primitive() {
      return 'string';
    },
    ...input,
  };
}