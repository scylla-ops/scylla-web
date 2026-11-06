import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import { notificationMessages } from '../messages/notifications.messages.ts';

const LABELS: Readonly<Record<string, MessageDescriptor>> = {
  access: notificationMessages.categoryAccess,
  security: notificationMessages.categorySecurity,
};

/** The categories of the core. An edition can add one: the page also lists what its rows have. */
export const CORE_CATEGORIES: readonly string[] = Object.keys(LABELS);

/** The name of a category. A category of an edition shows as it is, with a capital letter. */
export const categoryLabel = (category: string): string => {
  const label = LABELS[category];
  return label ? t(label) : category.charAt(0).toUpperCase() + category.slice(1);
};
