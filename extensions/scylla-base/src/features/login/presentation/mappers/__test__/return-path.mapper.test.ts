// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { loginPath, loginPathBackTo, returnPathOf, safeReturnPath } from '../return-path.mapper.ts';

describe('safeReturnPath', () => {
  it.each([
    ['/invite', '/invite'],
    ['/acme/members?tab=pending', '/acme/members?tab=pending'],
    ['/invite#token=abc-_123', '/invite#token=abc-_123'],
    ['/a/../invite', '/invite'],
  ])('accepts the path of this app %s', (raw, expected) => {
    expect(safeReturnPath(raw)).toBe(expected);
  });

  it.each([
    ['an empty value', ''],
    ['no value', null],
    ['a relative path', 'invite'],
    ['a protocol-relative URL', '//evil.example/invite'],
    ['a backslash that a browser reads as a slash', '/\\evil.example'],
    ['a backslash later in the path', '/x/\\\\evil.example'],
    ['an absolute URL', 'https://evil.example/invite'],
    ['a same-origin absolute URL', 'http://scylla.invalid/invite'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a tab that a browser drops', '/\t/evil.example'],
    ['a new line that a browser drops', '/\n/evil.example'],
    ['a dot segment that ends as //host', '/..//evil.example'],
  ])('refuses %s', (_case, raw) => {
    expect(safeReturnPath(raw)).toBeNull();
  });
});

describe('loginPath', () => {
  it('puts the return path in the fragment, with its own fragment kept', () => {
    const path = loginPath('/invite#token=abc+/=');

    expect(path.startsWith('/login#')).toBe(true);
    expect(path).not.toContain('?');
    expect(returnPathOf(new URL(path, 'http://scylla.invalid').hash)).toBe('/invite#token=abc+/=');
  });
});

describe('returnPathOf', () => {
  it('reads the return path of the fragment', () => {
    expect(returnPathOf('#next=%2Finvite%23token%3Dabc')).toBe('/invite#token=abc');
  });

  it('gives null for a fragment with no return path', () => {
    expect(returnPathOf('')).toBeNull();
    expect(returnPathOf('#token=abc')).toBeNull();
  });

  it('gives null for a return path that leaves the app', () => {
    expect(returnPathOf(`#next=${encodeURIComponent('//evil.example')}`)).toBeNull();
    expect(returnPathOf(`#next=${encodeURIComponent('javascript:alert(1)')}`)).toBeNull();
  });
});

describe('loginPathBackTo', () => {
  const back = (pathname: string, hash = '', search = '') =>
    loginPathBackTo({ pathname, search, hash });

  it('returns to the page, its query and its fragment, all in the fragment', () => {
    const path = back('/invite', '#token=abc', '?from=mail');

    expect(path).not.toContain('?');
    expect(returnPathOf(new URL(path, 'http://scylla.invalid').hash)).toBe(
      '/invite?from=mail#token=abc',
    );
  });

  it('gives the plain login page on the login page', () => {
    expect(back('/login', '#next=%2Facme')).toBe('/login');
    expect(back('/login/')).toBe('/login');
  });

  it('gives the plain login page for a path that leaves the app', () => {
    expect(back('//evil.example/x')).toBe('/login');
  });
});
