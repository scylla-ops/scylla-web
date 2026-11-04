import { type FormItem, FormItemType } from '@scylla/ui';
import { t } from '@lingui/core/macro';

export const createOrganizationItems = (): readonly FormItem<'name' | 'slug'>[] => [
  {
    id: 'name',
    label: t`Organization name`,
    placeholder: t`e.g., My Organization`,
    type: FormItemType.Input,
    inputType: 'text',
  },
  {
    id: 'slug',
    label: t`Address`,
    placeholder: t`e.g., my-workspace`,
    type: FormItemType.Input,
    inputType: 'text',
    optional: true,
  },
];
