import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from '../lib/errors';

export function authenticate(secret: string): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in.'));
    try {
      const claims = jwt.verify(header.slice(7), secret, {
        algorithms: ['HS256'],
        issuer: 'miniledger',
        audience: 'miniledger-app',
      });
      if (typeof claims === 'string' || !z.uuid().safeParse(claims.sub).success)
        throw new Error('Invalid subject');
      res.locals.userId = claims.sub;
      next();
    } catch {
      next(new AppError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.'));
    }
  };
}
