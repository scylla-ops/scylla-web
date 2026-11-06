import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { ShellModule } from '@base/shell/shell.module.ts';

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator();
});

afterEach(() => navigator.restore());

describe('the fallback of the shell', () => {
  it('stays on the URL and links to the root, where the guard checks the session', () => {
    render(ShellModule.fallback);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Scylla' })).toHaveAttribute('href', '/');
    expect(navigator.navigate).not.toHaveBeenCalled();
  });
});
