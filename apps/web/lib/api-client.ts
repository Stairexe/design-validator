/** Small fetch wrapper for client components; surfaces API error messages. */
export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: init.body === undefined ? {} : { 'content-type': 'application/json' },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!response.ok)
    throw new Error(payload.error?.message ?? `Request failed (${response.status}).`);
  return payload;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';
