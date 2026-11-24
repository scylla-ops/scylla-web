import type { Component } from 'svelte';
import type { MessageDescriptor } from '@lingui/core';
import type { LucideIcon } from '@scylla/ui';
import type { RoutePermission } from './register.struct.ts';

interface CommandBase {
  /** Unique across the app: `<module id>.<name>`. */
  id: string;
  /** A full name: two commands of the app must not read the same. */
  title: MessageDescriptor;
  /** Other words that find the row, in one text: the translators choose them. */
  keywords?: MessageDescriptor;
  icon: LucideIcon;
  /** The row hides for a user without it, as a sidebar link hides. */
  permission?: RoutePermission;
  /** Reactive. `false` hides the row, e.g. when it needs an open project. */
  available?: () => boolean;
  /** Reactive. `true` shows the row in the bar with no text: it acts on the current page. */
  here?: () => boolean;
  /** Reactive. What the row acts on, e.g. the name of the open project. */
  place?: () => MessageDescriptor | string | undefined;
}

/** Enter opens a page that has no sidebar link. */
export interface GoCommand extends CommandBase {
  kind: 'go';
  /** Reactive. The URL, or `null` to hide the row. */
  path: () => string | null;
}

/** The props of a dialog that a `CreateCommand` opens. */
export interface CommandFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * Enter opens the form that creates the item. The form is the check: the bar itself changes no
 * data. `TProps` are the other props of the dialog, and `props` gives them.
 */
export interface CommandForm<TProps extends object = object> {
  load: () => Promise<{ default: Component<CommandFormProps & TProps> }>;
  props?: () => TProps;
}

export interface CreateCommand extends CommandBase {
  kind: 'create';
  /** A dialog, or the URL of a page with the form. */
  form: CommandForm | { path: () => string | null };
}

/** One value of a preference of this device. Enter sets it at once, and a toast gives Undo. */
export interface ChoiceCommand extends CommandBase {
  kind: 'choice';
  /** The name of the preference. The rows with the same `type` are the values of one preference. */
  type: MessageDescriptor;
  /** Reactive. */
  current: () => boolean;
  select: () => void | Promise<void>;
}

/** A preference of this device with two states. Enter flips it at once, and a toast gives Undo. */
export interface ToggleCommand extends CommandBase {
  kind: 'toggle';
  type: MessageDescriptor;
  /** Reactive. */
  on: () => boolean;
  set: (on: boolean) => void;
}

/** An action that a typo must not start: Enter asks the question, and a second Enter runs it. */
export interface ConfirmCommand extends CommandBase {
  kind: 'confirm';
  type: MessageDescriptor;
  /** The word of the row and of the button, e.g. `Sign out`. */
  verb: MessageDescriptor;
  question: MessageDescriptor;
  detail?: MessageDescriptor;
  run: () => void | Promise<void>;
}

/**
 * A row of the command bar that is not a page. A sidebar link is a row with no declaration. The
 * bar never deletes: a dangerous action stays on its page, behind its own dialog.
 */
export type CommandDefinition =
  | GoCommand
  | CreateCommand
  | ChoiceCommand
  | ToggleCommand
  | ConfirmCommand;

/** Declares a form with its props: it keeps the types of the dialog and of `props` together. */
export const commandForm = <TProps extends object>(
  form: CommandForm<TProps>,
): CommandForm => form as unknown as CommandForm;
