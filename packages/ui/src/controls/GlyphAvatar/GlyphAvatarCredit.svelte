<script lang="ts">
  import { t } from '../../i18n/index.ts';
  import { cn } from '../../utils/index.ts';
  import { glyphAvatarMessages as m } from './glyph-avatar.messages.ts';

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();

  const LINK = 'underline decoration-border underline-offset-2 transition-colors hover:text-foreground';
</script>

<!-- The attribution that the license CC BY 4.0 of the style asks for. -->
<p data-slot="glyph-avatar-credit" class={cn('text-xs text-muted-foreground', className)}>
  <a class={LINK} href="https://www.figma.com/community/file/1249154526125777853" target="_blank" rel="noopener noreferrer">{t(m.creditStyle)}</a>
  {t(m.creditBy)} ·
  <a class={LINK} href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">{t(m.creditLicense)}</a>
  ·
  <a class={LINK} href="https://www.dicebear.com/styles/glyphs/" target="_blank" rel="noopener noreferrer">{t(m.creditVia)}</a>
</p>
