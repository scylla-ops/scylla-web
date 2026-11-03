import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Says in one line what `vite preview` would hide behind a 404: the app is not built. */
export default function checkBuild(): void {
  const index = fileURLToPath(new URL('../../dist/index.html', import.meta.url));
  if (!existsSync(index)) {
    throw new Error(
      'No dist/index.html: build the app first (pnpm build), then run pnpm test:e2e.',
    );
  }
}
