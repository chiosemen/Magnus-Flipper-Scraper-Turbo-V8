import { createMiddleware } from 'hono/factory';
import { auth } from '../lib/firebase';
import { UnauthorizedError } from '../utils/errors';
import { DecodedIdToken } from 'firebase-admin/auth';

type Env = {
  Variables: {
    user: DecodedIdToken;
    token: string;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    c.set('user', decodedToken);
    c.set('token', token);
    await next();
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
});