import type { ExtensionClass } from '@scylla/core-sdk';
import { compileRoutes, loadExtensions } from '@scylla/core';

/** Loads the pages of these paths before a test: a cold `import()` can take more than the 1 s of a `findBy*`. */
export const loadPages = async (
  extensions: readonly ExtensionClass[],
  ...paths: string[]
): Promise<void> => {
  const { routes } = compileRoutes(loadExtensions(extensions).router);
  await Promise.all(
    paths.map(path => {
      const page = routes.find(route => `/${route.path.join('/')}` === path)?.page;
      if (!page) throw new Error(`No page on ${path}.`);
      return page();
    }),
  );
};
