import type { MessageDescriptor } from '@lingui/core';
import type { HTMLInputAttributes } from 'svelte/elements';

export enum FormItemType {
  Input = 'input',
  Select = 'select',
}

export type FormInput = {
  type: FormItemType.Input;
  inputType: 'text' | 'password' | 'email' | 'tel';
  pattern?: string;
  autocomplete?: HTMLInputAttributes['autocomplete'];
  readonly?: boolean;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type FormSelect = {
  type: FormItemType.Select;
  options: SelectOption[];
};

export type FormItemBase<TId extends string = string> = {
  label: string;
  placeholder?: string;
  id: TId;
  class?: string;
  disabled?: boolean;
  optional?: boolean;
  defaultValue?: string;
  /** A hint under the field. */
  description?: string;
  /**
   * The message of a wrong value, or `undefined`. The form shows it when the field loses the
   * focus or when a submit is tried, and does not submit while there is one.
   */
  validate?: (value: string, values: FormValues<TId>) => MessageDescriptor | undefined;
};

export type FormItem<TId extends string = string> = FormItemBase<TId> & (FormInput | FormSelect);

/** One string per item id. `TId` comes from the `items`, so a typo is a type error. */
export type FormValues<TId extends string = string> = Record<TId, string>;
