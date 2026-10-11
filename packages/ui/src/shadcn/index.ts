/**
 * The shadcn primitives, ported to Svelte on bits-ui.
 *
 * Ported on demand: a primitive lands here when its first consumer needs it.
 * Class strings are copied verbatim from shadcn/ui, which is why the design
 * survived the migration from React untouched.
 */
import {
  AlertDialog as AlertDialogPrimitive,
  Dialog as DialogPrimitive,
  DropdownMenu as DropdownMenuPrimitive,
  Select as SelectPrimitive,
} from 'bits-ui';

export { default as Button } from './button/button.svelte';
// Not from the `.svelte` file: `tsc` only ever sees a component's default
// export, so anything a `.ts` needs to import must live in a `.ts`.
export { buttonVariants, type ButtonSize, type ButtonVariant } from './button/button-variants.ts';

export { default as Card } from './card/card.svelte';
export { default as CardAction } from './card/card-action.svelte';
export { default as CardContent } from './card/card-content.svelte';
export { default as CardDescription } from './card/card-description.svelte';
export { default as CardFooter } from './card/card-footer.svelte';
export { default as CardHeader } from './card/card-header.svelte';
export { default as CardTitle } from './card/card-title.svelte';

export { default as Input } from './input/input.svelte';
export { default as Skeleton } from './skeleton/skeleton.svelte';

export { default as Tooltip } from './tooltip/tooltip.svelte';
export { default as TooltipContent } from './tooltip/tooltip-content.svelte';
export { default as TooltipTrigger } from './tooltip/tooltip-trigger.svelte';

// The parts that carry no styling are bits-ui's own, aliased here rather than
// wrapped — `shadcn/dialog.tsx` does exactly the same with Radix. A wrapper
// whose whole body is `<Primitive {...rest} />` is a file to keep in sync for
// nothing.
export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogTrigger = DialogPrimitive.Trigger;
export { default as DialogContent } from './dialog/dialog-content.svelte';
export { default as DialogDescription } from './dialog/dialog-description.svelte';
export { default as DialogFooter } from './dialog/dialog-footer.svelte';
export { default as DialogHeader } from './dialog/dialog-header.svelte';
export { default as DialogOverlay } from './dialog/dialog-overlay.svelte';
export { default as DialogTitle } from './dialog/dialog-title.svelte';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export { default as AlertDialogAction } from './alert-dialog/alert-dialog-action.svelte';
export { default as AlertDialogCancel } from './alert-dialog/alert-dialog-cancel.svelte';
export { default as AlertDialogContent } from './alert-dialog/alert-dialog-content.svelte';
export { default as AlertDialogDescription } from './alert-dialog/alert-dialog-description.svelte';
export { default as AlertDialogFooter } from './alert-dialog/alert-dialog-footer.svelte';
export { default as AlertDialogHeader } from './alert-dialog/alert-dialog-header.svelte';
export { default as AlertDialogOverlay } from './alert-dialog/alert-dialog-overlay.svelte';
export { default as AlertDialogTitle } from './alert-dialog/alert-dialog-title.svelte';

export { default as Checkbox } from './checkbox/checkbox.svelte';

export { default as Avatar } from './avatar/avatar.svelte';
export { default as AvatarFallback } from './avatar/avatar-fallback.svelte';
export { default as AvatarImage } from './avatar/avatar-image.svelte';

export { default as TableBody } from './table/table-body.svelte';
export { default as TableCell } from './table/table-cell.svelte';
export { default as TableHead } from './table/table-head.svelte';
export { default as TableHeader } from './table/table-header.svelte';
export { default as TableRow } from './table/table-row.svelte';

export { default as Label } from './label/label.svelte';
export { default as Field } from './field/field.svelte';
export { default as FieldGroup } from './field/field-group.svelte';
export { default as FieldLabel } from './field/field-label.svelte';
export { fieldVariants, type FieldOrientation } from './field/field-variants.ts';

export const Select = SelectPrimitive.Root;
export { default as SelectContent } from './select/select-content.svelte';
export const SelectGroup = SelectPrimitive.Group;
export { default as SelectGroupHeading } from './select/select-group-heading.svelte';
export { default as SelectItem } from './select/select-item.svelte';
export { default as SelectTrigger } from './select/select-trigger.svelte';
export { default as SelectValue } from './select/select-value.svelte';

export { default as Badge } from './badge/badge.svelte';
export { badgeVariants, type BadgeVariant } from './badge/badge-variants.ts';

export { default as Switch } from './switch/switch.svelte';

export { default as Separator } from './separator/separator.svelte';

export { default as CodeSnippet } from './code-snippet/code-snippet.svelte';

export { default as RadioGroup } from './radio-group/radio-group.svelte';
export { default as RadioGroupItem } from './radio-group/radio-group-item.svelte';

export { default as ToggleGroup } from './toggle-group/toggle-group.svelte';
export { default as ToggleGroupItem } from './toggle-group/toggle-group-item.svelte';
export { toggleVariants, type ToggleSize, type ToggleVariant } from './toggle-group/toggle-variants.ts';

export { default as Tabs } from './tabs/tabs.svelte';
export { default as TabsContent } from './tabs/tabs-content.svelte';
export { default as TabsList } from './tabs/tabs-list.svelte';
export { default as TabsTrigger } from './tabs/tabs-trigger.svelte';

// Root and trigger carry no styling — bits-ui's own, aliased rather than
// wrapped, as with `Dialog` above.
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export { default as DropdownMenuContent } from './dropdown-menu/dropdown-menu-content.svelte';
export { default as DropdownMenuItem } from './dropdown-menu/dropdown-menu-item.svelte';
export { default as DropdownMenuLabel } from './dropdown-menu/dropdown-menu-label.svelte';
export { default as DropdownMenuSeparator } from './dropdown-menu/dropdown-menu-separator.svelte';
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export { default as DropdownMenuRadioItem } from './dropdown-menu/dropdown-menu-radio-item.svelte';

export { default as Sidebar } from './sidebar/sidebar.svelte';
export { default as SidebarContent } from './sidebar/sidebar-content.svelte';
export { default as SidebarFooter } from './sidebar/sidebar-footer.svelte';
export { default as SidebarGroup } from './sidebar/sidebar-group.svelte';
export { default as SidebarGroupLabel } from './sidebar/sidebar-group-label.svelte';
export { default as SidebarInset } from './sidebar/sidebar-inset.svelte';
export { default as SidebarMenu } from './sidebar/sidebar-menu.svelte';
export { default as SidebarMenuButton } from './sidebar/sidebar-menu-button.svelte';
export { default as SidebarMenuItem } from './sidebar/sidebar-menu-item.svelte';
export { default as SidebarProvider } from './sidebar/sidebar-provider.svelte';
export { default as SidebarRail } from './sidebar/sidebar-rail.svelte';
export { getSidebar, type SidebarState } from './sidebar/sidebar-state.svelte.ts';

export { default as Pagination } from './pagination/pagination.svelte';
export { default as PaginationContent } from './pagination/pagination-content.svelte';
export { default as PaginationEllipsis } from './pagination/pagination-ellipsis.svelte';
export { default as PaginationItem } from './pagination/pagination-item.svelte';
export { default as PaginationLink } from './pagination/pagination-link.svelte';
export { default as PaginationNext } from './pagination/pagination-next.svelte';
export { default as PaginationPrevious } from './pagination/pagination-previous.svelte';
export { default as Toaster } from './sonner/sonner.svelte';
