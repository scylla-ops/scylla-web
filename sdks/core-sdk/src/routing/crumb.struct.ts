import type { MessageDescriptor } from '@lingui/core';

/** The route parameters, and the values that the extensions add (`ShellContributions.breadcrumbParams`). */
export type BreadcrumbParams = Readonly<Record<string, string | undefined>>;

/**
 * `label` and `detail` are translated; `highlight` is data, shown as it is.
 * Descriptors, so that routes can be declared in a plain `.ts` file.
 */
export interface Crumb {
  label: MessageDescriptor;
  highlight?: string;
  /** E.g. "Edit" or "Jobs". */
  detail?: MessageDescriptor;
}

export type BreadcrumbFn = (params: BreadcrumbParams) => Crumb;

/** A crumb of the current page, and the URL it links to. */
export interface TrailCrumb {
  breadcrumb: BreadcrumbFn;
  pathname: string;
}
