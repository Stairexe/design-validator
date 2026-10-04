import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optional access gate for public deployments: when APP_ACCESS_PASSWORD is
 * set, every page and API route requires HTTP Basic credentials (any user
 * name, that password). Health checks, cron (secret-protected) and the public
 * sample page stay reachable — the inspector loads the sample page itself.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++)
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env['APP_ACCESS_PASSWORD'];
  if (!password) return NextResponse.next();
  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    const decoded = atob(header.slice(6));
    const supplied = decoded.slice(decoded.indexOf(':') + 1);
    if (timingSafeEqual(supplied, password)) return NextResponse.next();
  }
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'www-authenticate': 'Basic realm="Design Validator", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|samples/|api/health|api/cron/).*)'],
};
