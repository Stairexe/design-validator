import { describe, expect, it } from 'vitest';

import { InspectorError, createRequestGuard, isPrivateAddress, validateTargetUrl } from '../src';

const resolveTo =
  (...addresses: string[]) =>
  () =>
    Promise.resolve(addresses);

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('blocks %s', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '172.32.0.1', '1.1.1.1', '2606:4700:4700::1111'])('allows %s', (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });
});

describe('validateTargetUrl', () => {
  it('accepts public http(s) URLs', async () => {
    const url = await validateTargetUrl('https://example.com/pricing', {
      resolver: resolveTo('93.184.216.34'),
    });
    expect(url.href).toBe('https://example.com/pricing');
  });

  it.each([
    ['not a url', 'valid absolute URL'],
    ['file:///etc/passwd', 'Only http and https'],
    ['ftp://example.com', 'Only http and https'],
    ['https://user:pw@example.com', 'credentials'],
    ['http://localhost:3000', 'Local and internal'],
    ['http://metadata.internal', 'Local and internal'],
    ['http://127.0.0.1', 'private or internal'],
    ['http://[::1]/', 'private or internal'],
    ['http://169.254.169.254/latest/meta-data', 'private or internal'],
  ])('rejects %s', async (input, message) => {
    await expect(validateTargetUrl(input)).rejects.toThrow(message);
  });

  it('rejects hostnames that resolve to private addresses (DNS rebinding style)', async () => {
    await expect(
      validateTargetUrl('https://evil.example', {
        resolver: resolveTo('93.184.216.34', '10.0.0.5'),
      }),
    ).rejects.toBeInstanceOf(InspectorError);
  });

  it('allows private hosts only when explicitly enabled', async () => {
    await expect(
      validateTargetUrl('http://127.0.0.1:3000', { allowPrivateHosts: true }),
    ).resolves.toBeInstanceOf(URL);
  });
});

describe('createRequestGuard', () => {
  it('blocks sub-requests into private networks and caches verdicts', async () => {
    let lookups = 0;
    const guard = createRequestGuard({
      resolver: (host) => {
        lookups++;
        return Promise.resolve([host === 'cdn.example' ? '93.184.216.34' : '10.0.0.1']);
      },
    });
    expect(await guard('https://cdn.example/a.png')).toBe(true);
    expect(await guard('https://cdn.example/b.png')).toBe(true);
    expect(await guard('http://intranet.example/')).toBe(false);
    expect(await guard('http://127.0.0.1/')).toBe(false);
    expect(await guard('data:image/png;base64,AAAA')).toBe(true);
    expect(lookups).toBe(2);
  });
});
