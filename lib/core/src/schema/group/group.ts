import {
  BaseFieldInput,
  BaseSchema,
  InferOutput,
} from '../../types';

export interface GroupSchema<
  TChildren extends BaseSchema<unknown>,
> extends BaseSchema<{
  active: boolean;
} & InferOutput<TChildren>> {
  readonly type: 'group';
  /**
   * The children item schema.
   */
  readonly children: TChildren;
}

interface MultifieldInput<TChildren extends BaseSchema<unknown>> extends BaseFieldInput {
  children: TChildren;
  toggle?: boolean;
}

export function group<const TChildren extends BaseSchema<unknown>>(input: MultifieldInput<TChildren>): GroupSchema<TChildren> {
  const { label, children, tooltip, toggle } = input;
  const childrenParse = children._parse();

  return {
    type: 'group',
    _parse() {
      return {
        type: 'group',
        label,
        tooltip,
        toggle,
        children: Array.isArray(childrenParse) ? childrenParse : [childrenParse],
      };
    },
    _primitive() {
      return 'json';
    },
    ...input,
  };
}