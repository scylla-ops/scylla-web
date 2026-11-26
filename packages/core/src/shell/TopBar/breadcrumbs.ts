import type { MessageDescriptor } from '@lingui/core';
import type { BreadcrumbParams, TrailCrumb } from '@scylla/core-sdk';

export interface BreadcrumbItem {
  label: string;
  highlight?: string;
  detail?: string;
  pathname: string;
}

export const breadcrumbsFor = (
  trail: readonly TrailCrumb[],
  params: BreadcrumbParams,
  translate: (message: MessageDescriptor) => string,
): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [];
  for (const { breadcrumb, pathname } of trail) {
    const crumb = breadcrumb(params);
    if (!crumb) break;

    items.push({
      label: typeof crumb.label === 'string' ? crumb.label : translate(crumb.label),
      highlight: crumb.highlight,
      detail: crumb.detail && translate(crumb.detail),
      pathname,
    });
  }
  return items;
};
