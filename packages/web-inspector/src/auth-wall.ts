/**
 * Hosted login pages that replace the requested page when a deployment is
 * protected. Measuring them would produce a report about the login screen.
 */
const LOGIN_WALLS: { host: RegExp; path: RegExp; message: string }[] = [
  {
    host: /(^|\.)vercel\.com$/,
    path: /^\/(login|sso|sso-api)(\/|$)/,
    message:
      'The page is protected by Vercel Authentication and showed a login screen instead. Audit the public production URL, or allow access in the Vercel project’s Deployment Protection settings.',
  },
  {
    host: /(^|\.)netlify\.app$|(^|\.)netlify\.com$/,
    path: /^\/(login|\.netlify\/identity)/,
    message: 'The page is password protected on Netlify and showed a login screen instead.',
  },
];

/** A login-wall explanation when `finalUrl` is a hosting provider's login page, else null. */
export function loginWallMessage(requestedUrl: string, finalUrl: string): string | null {
  const requested = new URL(requestedUrl);
  const final = new URL(finalUrl);
  if (requested.hostname === final.hostname) return null;
  const wall = LOGIN_WALLS.find(
    (candidate) => candidate.host.test(final.hostname) && candidate.path.test(final.pathname),
  );
  return wall?.message ?? null;
}

/** A warning when navigation ended on another host; the report then describes that page. */
export function redirectWarning(requestedUrl: string, finalUrl: string): string | null {
  const requested = new URL(requestedUrl);
  const final = new URL(finalUrl);
  return requested.hostname === final.hostname
    ? null
    : `The page redirected to ${final.hostname}; measurements describe that page.`;
}
