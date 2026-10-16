// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseUserAgent } from '../user-agent.calculator.ts';

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.2792.79';
const FIREFOX_LINUX =
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const OPERA_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0';
const CHROME_OS =
  'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1';
const SAFARI_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const SAMSUNG_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const CHROME_ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0';
const EDGE_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 EdgA/129.0.2792.84';

describe('parseUserAgent: browsers', () => {
  it.each([
    [CHROME_MAC, 'Chrome', 'macOS'],
    [EDGE_WINDOWS, 'Edge', 'Windows'],
    [FIREFOX_LINUX, 'Firefox', 'Linux'],
    [SAFARI_MAC, 'Safari', 'macOS'],
    [OPERA_WINDOWS, 'Opera', 'Windows'],
    [CHROME_OS, 'Chrome', 'ChromeOS'],
  ])('reads a desktop browser and its system: %s', (userAgent, browser, system) => {
    expect(parseUserAgent(userAgent)).toEqual({ browser, system, kind: 'desktop' });
  });

  it.each([
    [SAFARI_IPHONE, 'Safari', 'iOS'],
    [CHROME_IPHONE, 'Chrome', 'iOS'],
    [SAMSUNG_ANDROID, 'Samsung Internet', 'Android'],
    [CHROME_ANDROID, 'Chrome', 'Android'],
    [FIREFOX_ANDROID, 'Firefox', 'Android'],
    [EDGE_ANDROID, 'Edge', 'Android'],
  ])('reads a phone browser as mobile: %s', (userAgent, browser, system) => {
    expect(parseUserAgent(userAgent)).toEqual({ browser, system, kind: 'mobile' });
  });

  it('counts a tablet as a desktop, since it is not a phone', () => {
    expect(parseUserAgent(SAFARI_IPAD)).toEqual({
      browser: 'Safari',
      system: 'iOS',
      kind: 'desktop',
    });
    expect(parseUserAgent(CHROME_ANDROID_TABLET)).toEqual({
      browser: 'Chrome',
      system: 'Android',
      kind: 'desktop',
    });
  });

  it('keeps a browser whose system it does not know', () => {
    expect(parseUserAgent('Mozilla/5.0 Firefox/131.0')).toEqual({
      browser: 'Firefox',
      kind: 'desktop',
    });
  });
});

describe('parseUserAgent: API clients', () => {
  it.each([
    ['grpc-python/1.66.1 grpc-c/43.0.0 (linux; chttp2)', 'gRPC Python'],
    ['grpc-node-js/1.12.2', 'gRPC Node.js'],
    ['grpc-go/1.67.1', 'gRPC Go'],
    ['grpc-java-netty/1.68.0', 'gRPC Java'],
    ['tonic/0.12.3', 'gRPC Rust'],
    ['curl/8.7.1', 'curl'],
    ['python-requests/2.32.3', 'Python Requests'],
    ['Go-http-client/1.1', 'Go HTTP client'],
    ['PostmanRuntime/7.42.0', 'Postman'],
  ])('gives a readable name to %s', (userAgent, browser) => {
    expect(parseUserAgent(userAgent)).toEqual({ browser, kind: 'api' });
  });

  it('names an unknown client after its product token', () => {
    expect(parseUserAgent('scylla-cli/0.5.0 (darwin)')).toEqual({
      browser: 'scylla-cli',
      kind: 'api',
    });
  });

  it('takes a user agent with no known browser for an API client, also with a system', () => {
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toEqual({
      browser: 'Mozilla',
      kind: 'api',
    });
  });

  it('gives an empty user agent its own kind and no name, not the kind of an API client', () => {
    expect(parseUserAgent('')).toEqual({ kind: 'unknown' });
    expect(parseUserAgent('   ')).toEqual({ kind: 'unknown' });
  });
});
