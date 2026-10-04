import { describe, expect, it } from 'vitest';

import { loginWallMessage, redirectWarning } from '../src';

describe('loginWallMessage', () => {
  it('recognises the Vercel Authentication login screen', () => {
    expect(
      loginWallMessage(
        'https://my-app-git-feature-team.vercel.app/pricing',
        'https://vercel.com/login?next=%2Fsso-api%3Furl%3D…',
      ),
    ).toMatch(/Vercel Authentication/);
    expect(
      loginWallMessage('https://preview.vercel.app/', 'https://vercel.com/sso-api?url=x'),
    ).toMatch(/Vercel/);
  });

  it('ignores same-host navigation and ordinary redirects', () => {
    expect(loginWallMessage('https://example.com/a', 'https://example.com/login')).toBeNull();
    expect(loginWallMessage('https://example.com/', 'https://www.example.org/')).toBeNull();
    expect(loginWallMessage('https://example.com/', 'https://vercel.com/pricing')).toBeNull();
  });
});

describe('redirectWarning', () => {
  it('warns only when the final host differs', () => {
    expect(redirectWarning('https://a.com/x', 'https://a.com/y')).toBeNull();
    expect(redirectWarning('https://a.com/x', 'https://b.com/')).toMatch(/b\.com/);
  });
});
