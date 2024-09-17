import { ObjectEntries, ObjectOutput } from '../../types/object';
import { AddType, DeepPartial, LeavesPath, NodesPath, PathValue, UnArray } from '../../types';

type Operators = 'eq' | 'neq' | 'and' | 'or' | 'exists'

export interface Conditions<T extends Operators = Operators> {
  operator: T;
  field?: string;
  value?: any;
}

export interface ConditionOperators<TEntries extends ObjectEntries = any> {
  eq: <P extends NodesPath<UnArray<ObjectOutput<TEntries>>>>(
    field: P,
    value: PathValue<UnArray<ObjectOutput<TEntries>>, P>
  ) => Conditions<'eq'>;
  neq: <P extends NodesPath<UnArray<ObjectOutput<TEntries>>>>(
    field: P,
    value: PathValue<UnArray<ObjectOutput<TEntries>>, P>
  ) => Conditions<'neq'>;
  exists: <P extends NodesPath<UnArray<ObjectOutput<TEntries>>>>(
    field: P,
  ) => Conditions<'exists'>;
  and: (...args: Conditions[]) => Conditions<'and'>;
  or: (...args: Conditions[]) => Conditions<'or'>;
}

export type ConditionFn<TEntries extends ObjectEntries> = (ops: ConditionOperators<TEntries>) => Conditions;

export type ConditionsArgument<TEntries extends ObjectEntries> = AddType<UnArray<DeepPartial<ObjectOutput<TEntries>>>, ConditionFn<TEntries>>

export type Field = { id: string, condition?: Conditions, children?: Field[] }