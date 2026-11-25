import { currentPathname, currentSearch, navigateTo } from '@scylla/core-sdk';

/**
 * Some parameters of the query string, as state of a page: a copied link or a reload opens the
 * same view. A write replaces the current history entry and keeps the other parameters. The
 * query string is read back from the router, never copied.
 */
export const createSearchParams = <Name extends string>(names: readonly Name[]) => {
  // Bumped by each write, so the values read `currentSearch()` again without a reactive router.
  let revision = $state(0);

  const values = $derived.by(() => {
    void revision;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- parses the query string once, never state
    const params = new URLSearchParams(currentSearch());
    return Object.fromEntries(names.map(name => [name, params.get(name) ?? ''])) as Record<
      Name,
      string
    >;
  });

  return {
    /** `''` for a parameter that is not in the URL. */
    get values() {
      return values;
    },
    /** A blank value removes its parameter; a parameter that `next` does not name stays. */
    write(next: Partial<Record<Name, string>>) {
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- parses the query string once, never state
      const params = new URLSearchParams(currentSearch());
      for (const name of names) {
        const value = next[name];
        if (value === undefined) continue;
        if (value.trim()) params.set(name, value);
        else params.delete(name);
      }
      const query = params.toString();
      navigateTo(`${currentPathname()}${query ? `?${query}` : ''}`, { replace: true });
      revision += 1;
    },
  };
};
