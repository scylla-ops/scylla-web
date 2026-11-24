import type { Attachment } from 'svelte/attachments';

/**
 * Follows the sections of an article as the page scrolls: calls `onActive` with the id of the
 * last heading that went above the middle of the view. Nothing in a browser with no
 * `IntersectionObserver`: the table of contents then marks no section.
 */
export const followSections =
  (onActive: (id: string) => void): Attachment<HTMLElement> =>
  node => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => entry.isIntersecting);
        const last = visible[visible.length - 1];
        if (last) onActive(last.target.id);
      },
      { rootMargin: '0px 0px -60% 0px' },
    );
    node.querySelectorAll('[data-section]').forEach(section => observer.observe(section));

    // At the top of the page no section is read yet: the table of contents marks none.
    const onScroll = () => {
      if (window.scrollY <= 0) onActive('');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  };
