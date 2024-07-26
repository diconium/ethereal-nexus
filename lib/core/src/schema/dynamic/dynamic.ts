import {
  BaseSchema,
} from '../../types';

export interface DynamicZoneSchema extends BaseSchema<{
  dataPath: string;
  childrenHtml: string;
  dataConfig: {
    path: string,
    slingPath: string,
    type: string,
    isResponsiveGrid: boolean,
    csp: string,
    editConfig: { actions: string[], disableTargeting: boolean }
  };
}> {
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
      };
    },
    _primitive() {
      return 'json';
    },
    ...input,
  };
}