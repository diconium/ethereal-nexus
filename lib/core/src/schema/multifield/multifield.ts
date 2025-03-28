import {
  BaseFieldInput,
  BaseSchema,
  InferOutput, Output
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
  itemLabelKey?: keyof Output<TChildren>
}

export function multifield<const TChildren extends BaseSchema<unknown>>(input: MultifieldInput<TChildren>): MultifieldSchema<TChildren> {
  const {label, children, required, itemLabelKey} = input;
  const childrenParse = children._parse();

  return {
    type: 'multifield',
    _parse() {
      return {
        type: 'multifield',
        label,
        required,
        itemLabelKey,
        children: Array.isArray(childrenParse) ? childrenParse : [childrenParse]
      }
    },
    _primitive() {
      return 'json'
    },
    ...input
  };
}