import { createMiddleware } from 'hono/factory';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { DecodedIdToken } from 'firebase-admin/auth';
import { isAdminUser } from '../services/adminAuth.service';

type Env = {
  Variables: {
    user: DecodedIdToken;
  };
};

export const adminMiddleware = createMiddleware<Env>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    throw new UnauthorizedError('Unauthorized');
  }

  if (!isAdminUser(user)) {
    throw new ForbiddenError('Admin access required');
  }

  await next();
});
