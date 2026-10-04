import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { InspectorError } from './errors';

export type HostResolver = (hostname: string) => Promise<string[]>;

export interface UrlPolicy {
  /** Allow loopback/private targets. Only for local development and tests. */
  allowPrivateHosts?: boolean;
  resolver?: HostResolver;
}

const defaultResolver: HostResolver = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);

function ipv4ToInt(address: string): number {
  return address.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const PRIVATE_V4: readonly [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function isPrivateV4(address: string): boolean {
  const value = ipv4ToInt(address);
  return PRIVATE_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateV6(address: string): boolean {
  const lower = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::' || lower === '::1') return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped?.[1]) return isPrivateV4(mapped[1]);
  // fc00::/7 unique local, fe80::/10 link-local, ff00::/8 multicast
  return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith('ff');
}

/** True for loopback, private, link-local, CGNAT, documentation and multicast ranges. */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address.replace(/^\[|\]$/g, ''));
  if (version === 4) return isPrivateV4(address);
  if (version === 6) return isPrivateV6(address);
  return false;
}

const BLOCKED_HOST_SUFFIXES = ['localhost', '.localhost', '.local', '.internal', '.home.arpa'];

/**
 * Validates an untrusted URL before the browser touches it (SSRF defence,
 * architecture.md §7): http(s) only, no embedded credentials, and the host
 * must not resolve to a private or loopback address.
 */
export async function validateTargetUrl(input: string, policy: UrlPolicy = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new InspectorError('INVALID_URL', 'The website URL is not a valid absolute URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InspectorError(
      'INVALID_URL',
      `Only http and https URLs are supported (got ${url.protocol}).`,
    );
  }
  if (url.username || url.password) {
    throw new InspectorError('INVALID_URL', 'URLs with embedded credentials are not allowed.');
  }
  if (policy.allowPrivateHosts) {
    return url;
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    BLOCKED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix.replace(/^\./, '') || hostname.endsWith(suffix),
    )
  ) {
    throw new InspectorError('INVALID_URL', 'Local and internal hostnames are not allowed.');
  }

  const literal = hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(literal)
    ? [literal]
    : await resolveHost(hostname, policy.resolver ?? defaultResolver);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new InspectorError(
      'INVALID_URL',
      'The website URL resolves to a private or internal network address.',
    );
  }
  return url;
}

async function resolveHost(hostname: string, resolver: HostResolver): Promise<string[]> {
  try {
    return await resolver(hostname);
  } catch (error) {
    throw new InspectorError(
      'INVALID_URL',
      `The website host could not be resolved: ${hostname}.`,
      {
        cause: error,
      },
    );
  }
}

/**
 * Cached per-request guard for browser sub-requests, so a page cannot pivot
 * into the internal network through redirects, images or fetch calls.
 */
export function createRequestGuard(policy: UrlPolicy): (url: string) => Promise<boolean> {
  const cache = new Map<string, Promise<boolean>>();
  return (requestUrl) => {
    let parsed: URL;
    try {
      parsed = new URL(requestUrl);
    } catch {
      return Promise.resolve(false);
    }
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') {
      return Promise.resolve(true);
    }
    const key = `${parsed.protocol}//${parsed.host}`;
    let verdict = cache.get(key);
    if (!verdict) {
      verdict = validateTargetUrl(`${key}/`, policy).then(
        () => true,
        () => false,
      );
      cache.set(key, verdict);
    }
    return verdict;
  };
}
