<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { consentMessages as messages } from '../../messages/consent.messages.ts';
  import PreferencesForm, { type PreferencesFormProps } from './PreferencesForm.svelte';

  interface Props extends PreferencesFormProps {
    open: boolean;
    onclose: () => void;
  }

  let {
    open,
    rows,
    granted,
    globalPrivacyControl,
    lastChoice,
    policy,
    pending,
    onsave,
    onclose,
  }: Props = $props();
</script>

<ScyllaDialog
  {open}
  onOpenChange={next => {
    if (!next) onclose();
  }}
  title={t(messages.cookieSettings)}
  description={t(messages.preferencesDescription)}
  class="sm:max-w-xl"
>
  <!-- Built again at each opening: the switches start from the choice of the browser. -->
  <PreferencesForm {rows} {granted} {globalPrivacyControl} {lastChoice} {policy} {pending} {onsave} />
</ScyllaDialog>
