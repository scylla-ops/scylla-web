export type SessionDeviceKind = 'desktop' | 'mobile' | 'api' | 'unknown';

export interface SessionDevice {
  /** The browser, or the name of the API client. Absent for `unknown`. */
  browser?: string;
  /** Absent for an API client, and for a system that is not known. */
  system?: string;
  kind: SessionDeviceKind;
}

type Rule = readonly [RegExp, string];

/** The order matters: Edge, Opera and Samsung Internet also send `Chrome/` and `Safari/`. */
const BROWSERS: readonly Rule[] = [
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\bOP(?:R|T|iOS)\/|\bOpera\b/, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\b(?:Firefox|FxiOS)\//, 'Firefox'],
  [/\b(?:Chrome|CriOS)\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
];

/** The order matters: iOS sends `Mac OS X`, Android and ChromeOS send `Linux`. */
const SYSTEMS: readonly Rule[] = [
  [/\b(?:iPhone|iPad|iPod)\b/, 'iOS'],
  [/\bAndroid\b/, 'Android'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bWindows\b/, 'Windows'],
  [/\bMacintosh\b|\bMac OS X\b/, 'macOS'],
  [/\bLinux\b|\bX11\b/, 'Linux'],
];

/** Keyed by the product token, lower case. A longer token falls back to its shorter prefixes. */
const API_CLIENTS: Readonly<Record<string, string>> = {
  'grpc-python': 'gRPC Python',
  'grpc-node-js': 'gRPC Node.js',
  'grpc-node': 'gRPC Node.js',
  'grpc-go': 'gRPC Go',
  'grpc-java': 'gRPC Java',
  'grpc-dotnet': 'gRPC .NET',
  'grpc-csharp': 'gRPC C#',
  'grpc-ruby': 'gRPC Ruby',
  'grpc-php': 'gRPC PHP',
  tonic: 'gRPC Rust',
  curl: 'curl',
  wget: 'Wget',
  'python-requests': 'Python Requests',
  'python-httpx': 'HTTPX',
  'go-http-client': 'Go HTTP client',
  okhttp: 'OkHttp',
  axios: 'Axios',
  postmanruntime: 'Postman',
};

const firstMatch = (rules: readonly Rule[], userAgent: string): string | undefined =>
  rules.find(([pattern]) => pattern.test(userAgent))?.[1];

const isPhone = (userAgent: string): boolean =>
  /\b(?:iPhone|iPod)\b/.test(userAgent) ||
  (/\bAndroid\b/.test(userAgent) && /\bMobile\b/.test(userAgent));

const apiClientName = (userAgent: string): string => {
  const product = userAgent.split(/[\s/]/, 1)[0];
  const parts = product.toLowerCase().split('-');
  for (let length = parts.length; length > 0; length -= 1) {
    const name = API_CLIENTS[parts.slice(0, length).join('-')];
    if (name) return name;
  }
  return product;
};

/**
 * What a session runs on, from the user agent that opened it. A user agent with no known browser
 * is an API client; an empty one is `unknown`. A tablet is not a phone: it counts as a desktop.
 */
export const parseUserAgent = (userAgent: string): SessionDevice => {
  const value = userAgent.trim();
  if (!value) return { kind: 'unknown' };

  const browser = firstMatch(BROWSERS, value);
  if (!browser) return { browser: apiClientName(value), kind: 'api' };

  return {
    browser,
    system: firstMatch(SYSTEMS, value),
    kind: isPhone(value) ? 'mobile' : 'desktop',
  };
};
