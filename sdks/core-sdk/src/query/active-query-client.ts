import { QueryClient } from '@tanstack/query-core';

let active: QueryClient | null = null;
let fallback: QueryClient | null = null;

/** The client the core installs at start-up. Before that, as in a component test, a plain one. */
export const getQueryClient = (): QueryClient => active ?? (fallback ??= new QueryClient());

/** The core installs the app's client; a test installs its own (`retry: false`, a fresh cache). */
export const setQueryClient = (client: QueryClient | null): void => {
  active = client;
};
