import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { StorybookConfig } from '@storybook/svelte-vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { babelTransforms } from '../../tooling/vite.ts';

/**
 * Libraries with `.svelte` files. The dev server serves them as they are, as in `tooling/vite.ts`.
 */
const SVELTE_LIBRARIES = [
  '@storybook/svelte',
  '@storybook/addon-svelte-csf',
  '@lucide/svelte',
  'bits-ui',
  'paneforge',
  '@tanstack/svelte-table',
  'svelte-sonner',
];

const isSvelteLibrary = (entry: string) =>
  SVELTE_LIBRARIES.some(library => entry === library || entry.startsWith(`${library}/`));

/** Last: the presets of Storybook and the addon add their entries to `include`. */
const serveSvelteLibraries = (): Plugin => ({
  name: 'scylla:catalog-svelte-libraries',
  enforce: 'post',
  config: config => {
    const optimizeDeps = (config.optimizeDeps ??= {});
    optimizeDeps.include = (optimizeDeps.include ?? []).filter(entry => !isSvelteLibrary(entry));
    optimizeDeps.exclude = [...(optimizeDeps.exclude ?? []), ...SVELTE_LIBRARIES];
  },
});

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.svelte'],
  addons: ['@storybook/addon-svelte-csf', 'storybook-addon-pseudo-states'],
  framework: { name: '@storybook/svelte-vite', options: { docgen: false } },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  viteFinal: config => ({
    ...config,
    // First: the stories plugin of the addon reads the code that Svelte compiled.
    plugins: [
      babelTransforms(),
      svelte(),
      tailwindcss(),
      ...(config.plugins ?? []),
      serveSvelteLibraries(),
    ],
  }),
};

export default config;
