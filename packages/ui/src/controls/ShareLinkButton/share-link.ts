import { toast } from 'svelte-sonner';
import { t } from '../../i18n/lingui.adapter.svelte.ts';
import { copyToClipboard } from '../../utils/copy-to-clipboard.ts';
import { shareLinkButtonMessages } from './share-link-button.messages.ts';

/** A touch screen with the share sheet of the system shares a link. Another device copies it. */
export const sharesWithSystem = (): boolean =>
  typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;

const isCancel = (error: unknown): boolean =>
  (error as { name?: unknown } | null)?.name === 'AbortError';

/**
 * Opens the share sheet of the system, or copies the link, then tells the result in a toast.
 * A cancelled sheet tells nothing; a sheet that fails copies. True when the link went somewhere.
 */
export const shareLink = async (url: string, hint?: string): Promise<boolean> => {
  if (sharesWithSystem()) {
    try {
      await navigator.share({ title: document.title, url });
      const shared = t(shareLinkButtonMessages.linkShared);
      if (hint) toast.success(shared, { description: hint });
      else toast.success(shared);
      return true;
    } catch (error) {
      if (isCancel(error)) return false;
    }
  }
  return copyToClipboard(url, {
    copied: t(shareLinkButtonMessages.linkCopied),
    description: { copied: hint, failed: t(shareLinkButtonMessages.copyFromAddressBar) },
  });
};
