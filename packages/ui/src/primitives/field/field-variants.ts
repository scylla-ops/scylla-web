import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Ported from `shadcn/field.tsx`. A field with content keeps its control centered, not
 * on the first line. In a `.ts` beside the component because `tsc` only ever sees a
 * `.svelte` file's default export.
 */
export const fieldVariants = cva(
  'group/field flex w-full gap-3 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
        horizontal: [
          'flex-row items-center',
          '[&>[data-slot=field-label]]:flex-auto',
        ],
        responsive: [
          'flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto',
          '@md/field-group:[&>[data-slot=field-label]]:flex-auto',
        ],
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
);

export type FieldOrientation = NonNullable<VariantProps<typeof fieldVariants>['orientation']>;
