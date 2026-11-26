// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { providerOf } from '../mail-provider.struct.ts';

describe('the provider of a host', () => {
  it('knows the hosts of each provider, and calls another host custom', () => {
    expect(providerOf('smtp.tem.scaleway.com')).toBe('scaleway');
    expect(providerOf('mail26.lwspanel.com')).toBe('lws');
    expect(providerOf('SMTP-RELAY.BREVO.COM')).toBe('brevo');
    expect(providerOf('smtp.postmarkapp.com')).toBe('postmark');
    expect(providerOf('email-smtp.us-east-1.amazonaws.com')).toBe('ses');
    expect(providerOf('in-v3.mailjet.com')).toBe('mailjet');
    expect(providerOf('smtp.example.com')).toBe('custom');
  });
});
