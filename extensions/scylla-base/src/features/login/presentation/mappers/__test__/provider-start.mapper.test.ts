import { describe, it, expect } from 'vitest';
import { providerStartUrl } from '../provider-start.mapper.ts';

describe('providerStartUrl', () => {
  it('gives the start route of the provider with the full return address', () => {
    expect(
      providerStartUrl('https://api.example.com', 'github', 'https://app.example.com', '/acme'),
    ).toBe(
      'https://api.example.com/auth/github/start?return_to=https%3A%2F%2Fapp.example.com%2Facme',
    );
  });

  it('works with a relative API address', () => {
    expect(providerStartUrl('', 'corp sso', 'http://localhost', '/')).toBe(
      '/auth/corp%20sso/start?return_to=http%3A%2F%2Flocalhost%2F',
    );
  });
});
