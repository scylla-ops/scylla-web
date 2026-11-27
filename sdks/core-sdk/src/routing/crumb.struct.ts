import type { MessageDescriptor } from '@lingui/core';

/** The route parameters, and the values that the extensions add (`ShellContributions.breadcrumbParams`). */
export type BreadcrumbParams = Readonly<Record<string, string | undefined>>;

/**
 * A descriptor `label` and `detail` are translated; a text `label` and `highlight` are data, shown
 * as they are. Descriptors, so that routes can be declared in a plain `.ts` file.
 */
export interface Crumb {
  label: MessageDescriptor | string;
  highlight?: string;
  /** E.g. "Edit" or "Jobs". */
  detail?: MessageDescriptor;
}

/**
 * `null`: this crumb and the ones after it do not show. The page below a missing entity has no
 * trail of its own.
 */
export type BreadcrumbFn = (params: BreadcrumbParams) => Crumb | null;

/** A crumb of the current page, and the URL it links to. */
export interface TrailCrumb {
  breadcrumb: BreadcrumbFn;
  pathname: string;
}
