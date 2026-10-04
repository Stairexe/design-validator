import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../../fixtures/websites');

/** Serves `fixtures/websites` on an ephemeral localhost port. */
export async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((request, response) => {
    const name = path.basename(new URL(request.url ?? '/', 'http://x').pathname);
    readFile(path.join(root, name)).then(
      (body) => {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(body);
      },
      () => {
        response.writeHead(404).end('not found');
      },
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no address');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          resolve();
        }),
      ),
  };
}
