import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import supertest from 'supertest';
import app from '../../src/app';

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const createApiClient = () => {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const body = await readBody(req);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    const response = await app.fetch(new Request(url.toString(), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: body.length ? body : undefined,
    }));

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = Buffer.from(await response.arrayBuffer());
    res.end(responseBody);
  });

  return supertest(server);
};
