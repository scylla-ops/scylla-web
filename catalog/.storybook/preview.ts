import './catalog.css';
import { setAppLocale, type SupportedLocale } from '@scylla/ui/i18n';
import { setThemePreference, type Theme } from '@scylla/ui/stores';
import type { Preview } from '@storybook/svelte-vite';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'The theme of the app',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'The language of the texts',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'fr', title: 'Français' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', locale: 'en' },
  loaders: [
    async ({ globals }) => {
      await setAppLocale(globals.locale as SupportedLocale);
      return {};
    },
  ],
  decorators: [
    (story, { globals }) => {
      setThemePreference(globals.theme as Theme);
      return story();
    },
  ],
  parameters: { layout: 'padded' },
};

export default preview;
