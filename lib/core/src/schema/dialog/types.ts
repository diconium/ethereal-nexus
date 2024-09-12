import { ObjectEntries, ObjectOutput } from '../../types/object';
import { AddType, DeepPartial, Leaves, PathValue, UnArray } from '../../types';

export interface Conditions {
  field: string;
  operator: 'eq' | 'neq' | 'and' | 'or';
  value: any;
}

export interface ConditionOperators<TEntries extends ObjectEntries = any> {
  eq: <P extends Leaves<UnArray<ObjectOutput<TEntries>>>>(
    field: P,
    value: PathValue<UnArray<ObjectOutput<TEntries>>, P>
  ) => Conditions;
}

type ConditionFn<TEntries extends ObjectEntries> = (ops: ConditionOperators<TEntries>) => Conditions;

export type ConditionsArgument<TEntries extends ObjectEntries> = AddType<UnArray<DeepPartial<ObjectOutput<TEntries>>>, ConditionFn<TEntries>>

export type Field = { id: string, condition?: Conditions, children?: Field[] }