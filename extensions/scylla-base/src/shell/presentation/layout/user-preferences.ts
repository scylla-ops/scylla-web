import { chooseAppLocale, getCurrentLocale, type SupportedLocale } from '@scylla/ui/i18n';
import {
  getThemePreference,
  setThemePreference,
  subscribeToTheme,
  type ThemePreference,
} from '@scylla/ui/stores';
import { userState } from '@platform/user-state';

/** Shared with the theme store and the inline script of `index.html`. */
const THEME_KEY = 'scylla-theme';

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const theme = userState.define<ThemePreference>({
  key: 'theme',
  decode: value => (isThemePreference(value) ? value : null),
  // The raw key: with no key the store gives dark, and that is not a choice of the person.
  readLocal: () => {
    const stored = localStorage.getItem(THEME_KEY);
    return isThemePreference(stored) ? stored : null;
  },
  writeLocal: (_, value) => setThemePreference(value),
});

// The store also notifies at a change of the OS: `save` sends nothing when the choice is the same.
subscribeToTheme(() => theme.save(getThemePreference()));

const locale = userState.define<SupportedLocale>({
  key: 'locale',
  decode: value => (value === 'en' || value === 'fr' ? value : null),
  readLocal: () => getCurrentLocale(),
  // The value of the server is a choice of the person on another device.
  writeLocal: (_, value) => void chooseAppLocale(value),
  // The current language can be the language of the browser: it does not prove a choice.
  upload: false,
});

/** The choice of the person: only it writes the local key. The load of a page writes nothing. */
export const chooseLocale = async (next: SupportedLocale): Promise<void> => {
  await chooseAppLocale(next);
  locale.save(next);
};
