import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export function requireApiToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.APP_API_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'API access is not configured. Set APP_API_TOKEN.' });
    return next();
  }

  const supplied = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return res.status(401).json({ error: 'A valid workspace access token is required.' });
  }
  next();
}
