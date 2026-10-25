import type { MessageDescriptor } from '@lingui/core';
import { FormItemType, type FormItem, type FormValues } from './scylla-form.struct.ts';

export interface FormState<TId extends string> {
  readonly values: FormValues<TId>;
  /** The required fields are filled and match their pattern. */
  readonly isValid: boolean;
  handleChange: (id: TId, value: string) => void;
  reset: () => void;
  /** The field lost the focus: its `validate` message shows from now on. */
  touch: (id: TId) => void;
  /** The `validate` message of a touched field, or of any field after `validate()`. */
  errorOf: (id: TId) => MessageDescriptor | undefined;
  /** Shows every `validate` message. True when there is none. */
  validate: () => boolean;
}

const initialValues = <TId extends string>(items: readonly FormItem<TId>[]): FormValues<TId> =>
  Object.fromEntries(items.map(item => [item.id, item.defaultValue ?? ''])) as FormValues<TId>;

/**
 * Values, changes, reset and validity of a declarative form. `items` typed with
 * literal ids types `values` (`values.username`). `items` is a getter; the values
 * are seeded once, so what the user typed survives a change of the items.
 */
export const createFormState = <TId extends string>(
  items: () => readonly FormItem<TId>[],
): FormState<TId> => {
  let values = $state<FormValues<TId>>(initialValues(items()));
  let touched = $state<readonly TId[]>([]);
  let submitted = $state(false);

  const isValid = $derived(
    items().every(item => {
      if (item.optional) return true;
      const value = values[item.id] ?? '';
      if (value.trim().length === 0) return false;
      // Only inputs have a pattern; a select picks from a closed list.
      if (item.type !== FormItemType.Input || !item.pattern) return true;
      return new RegExp(item.pattern).test(value);
    }),
  );

  /** An empty optional field is never wrong. */
  const messageOf = (item: FormItem<TId>): MessageDescriptor | undefined => {
    const value = values[item.id] ?? '';
    if (item.optional && value.length === 0) return undefined;
    return item.validate?.(value, values);
  };

  return {
    get values() {
      return values;
    },
    get isValid() {
      return isValid;
    },
    handleChange: (id: TId, value: string) => {
      values = { ...values, [id]: value };
    },
    reset: () => {
      values = initialValues(items());
      touched = [];
      submitted = false;
    },
    touch: (id: TId) => {
      if (!touched.includes(id)) touched = [...touched, id];
    },
    errorOf: (id: TId) => {
      if (!submitted && !touched.includes(id)) return undefined;
      const item = items().find(candidate => candidate.id === id);
      return item ? messageOf(item) : undefined;
    },
    validate: () => {
      submitted = true;
      return items().every(item => messageOf(item) === undefined);
    },
  };
};
