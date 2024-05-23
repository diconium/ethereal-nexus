import {
  BaseFieldInput,
  BaseSchema,
  InferOutput
} from '../../types';

export interface MultifieldSchema<
  TChildren extends BaseSchema<unknown>,
> extends BaseSchema<InferOutput<TChildren>[]> {
  readonly type: 'multifield';
  /**
   * The children item schema.
   */
  readonly children: TChildren;
}

interface MultifieldInput<TChildren extends BaseSchema<unknown>> extends BaseFieldInput {
  children: TChildren
}

export function multifield<const TChildren extends BaseSchema<unknown>>(input: MultifieldInput<TChildren>): MultifieldSchema<TChildren> {
  const {label, children} = input;
  const childrenParse = children._parse();

  return {
    type: 'multifield',
    _parse() {
      return {
        type: 'multifield',
        label,
        children: Array.isArray(childrenParse) ? childrenParse : [childrenParse]
      }
    },
    _primitive() {
      return 'string'
    },
    ...input
  };
}