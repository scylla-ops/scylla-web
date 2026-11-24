import type { MessageDescriptor } from '@lingui/core';
import type { LucideIcon } from '@scylla/ui';

/** A sidebar link that this user can open from here. */
export interface AppNavLink {
  /** The URL, with the parameters of the current page. */
  href: string;
  /** The path of the link in its mount, e.g. `agents`. */
  url: string;
  title: MessageDescriptor;
  keywords?: MessageDescriptor;
  icon?: LucideIcon;
  section: { id: string; title: MessageDescriptor };
  /** The title of the folding item of the link. */
  group?: MessageDescriptor;
}

let read: () => readonly AppNavLink[] = () => [];

/** Called once by the core at start-up. */
export const setNavLinks = (reader: () => readonly AppNavLink[]): void => {
  read = reader;
};

/** Reactive. The links of the sidebars, of all extensions, in their order. */
export const navLinks = (): readonly AppNavLink[] => read();
