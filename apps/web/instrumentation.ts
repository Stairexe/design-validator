import type { Instrumentation } from 'next';

/** Structured server error reporting (stdout JSON; collected by the platform's log drain). */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const err = error as Error & { digest?: string };
  // console works in both the Node.js and Edge runtimes; the platform collects it.
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      time: new Date().toISOString(),
      level: 'error',
      service: 'web',
      message: 'request error',
      error: err.message,
      digest: err.digest,
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
    }),
  );
};
