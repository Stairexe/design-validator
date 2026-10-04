export const dynamic = 'force-dynamic';

/** Liveness probe. Reports process health only; never exposes configuration. */
export function GET() {
  return Response.json({ status: 'ok', service: 'web' });
}
