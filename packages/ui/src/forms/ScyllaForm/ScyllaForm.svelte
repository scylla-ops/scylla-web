<script lang="ts" generics="TId extends string">
  import type { Snippet } from 'svelte';
  import {
    Button,
    Field,
    FieldGroup,
    FieldLabel,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '../../primitives/index.ts';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import PasswordInput from '../../controls/PasswordInput/PasswordInput.svelte';
  import FieldMessage from '../FieldMessage/FieldMessage.svelte';
  import { createFormState } from '../form.state.svelte.ts';
  import { FormItemType, type FormItem, type FormValues } from '../scylla-form.struct.ts';

  interface Props {
    items: readonly FormItem<TId>[];
    class?: string;
    onSubmit: (values: FormValues<TId>) => void;
    isPending?: boolean;
    /** A field before the items that is not text or a choice, e.g. an `IconField`. */
    leading?: Snippet;
    /** A field after the items that is not text or a choice of plain labels, e.g. a group picker. */
    trailing?: Snippet;
    footer?: Snippet<[{ isValid: boolean; isPending: boolean }]>;
    buttonLabel?: string;
    /** Messages from the server, shown under their field when the field has no message of its own. */
    errors?: Partial<Record<TId, string>>;
    /** Off on a page with several forms. */
    autofocus?: boolean;
  }

  let {
    items,
    class: className,
    onSubmit,
    isPending = false,
    leading,
    trailing,
    footer,
    buttonLabel,
    errors,
    autofocus = true,
  }: Props = $props();

  const form = createFormState(() => items);

  const errorOf = (id: TId): string | undefined => {
    const message = form.errorOf(id);
    return message ? t(message) : errors?.[id];
  };

  const describedBy = (item: FormItem<TId>, error: string | undefined): string | undefined =>
    [item.description && `${item.id}-description`, error && `${item.id}-error`]
      .filter(Boolean)
      .join(' ') || undefined;

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (form.validate()) onSubmit(form.values);
  };
</script>

<!-- `novalidate`: the form checks its values itself, with translated messages. -->
<form novalidate onsubmit={handleSubmit} class="space-y-4">
  <FieldGroup class={className}>
    {@render leading?.()}
    {#each items as item, index (item.id)}
      {@const error = errorOf(item.id)}
      <Field class="gap-1">
        <FieldLabel for={item.id}>{item.label}</FieldLabel>

        {#if item.type === FormItemType.Input}
          {#if item.inputType === 'password'}
            <PasswordInput
              id={item.id}
              autocomplete={item.autocomplete}
              readonly={item.readonly}
              disabled={isPending || item.disabled}
              placeholder={item.placeholder}
              class={item.class}
              autofocus={autofocus && index === 0}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={describedBy(item, error)}
              value={form.values[item.id]}
              oninput={event => form.handleChange(item.id, event.currentTarget.value)}
              onblur={() => form.touch(item.id)}
            />
            {:else}
            <Input
              id={item.id}
              type={item.inputType}
              autocomplete={item.autocomplete}
              readonly={item.readonly}
              disabled={isPending || item.disabled}
              placeholder={item.placeholder}
              class={item.class}
              autofocus={autofocus && index === 0}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={describedBy(item, error)}
              value={form.values[item.id]}
              oninput={event => form.handleChange(item.id, event.currentTarget.value)}
              onblur={() => form.touch(item.id)}
            />
            {/if}
        {:else}
          <!-- Not `bind:value`: the form state owns the value, reset and validity. -->
          <Select
            type="single"
            value={form.values[item.id]}
            items={item.options}
            onValueChange={value => form.handleChange(item.id, value)}
            disabled={isPending || item.disabled}
          >
            <SelectTrigger
              id={item.id}
              class={item.class ?? 'w-full'}
              aria-describedby={describedBy(item, error)}
            >
              <SelectValue placeholder={item.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {#each item.options as option (option.value)}
                <SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        {/if}

        {#if item.description}
          <p id="{item.id}-description" class="text-xs text-muted-foreground">
            {item.description}
          </p>
        {/if}
        <FieldMessage id="{item.id}-error" message={error} />
      </Field>
    {/each}
    {@render trailing?.()}
  </FieldGroup>

  {#if footer}
    {@render footer({ isValid: form.isValid, isPending })}
  {:else}
    <div class="mt-8 flex justify-end">
      <Button type="submit" disabled={!form.isValid || isPending}>{buttonLabel}</Button>
    </div>
  {/if}
</form>
