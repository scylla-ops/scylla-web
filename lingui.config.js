import { defineConfig } from '@lingui/cli';
import { scyllaCatalogs } from './tooling/lingui.js';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['fr', 'en'],
  catalogs: scyllaCatalogs(import.meta.dirname),
  compileNamespace: 'default',
});
