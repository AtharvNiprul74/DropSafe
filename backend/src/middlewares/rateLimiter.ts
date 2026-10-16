import rateLimit from 'express-rate-limit';
import { securityConfig } from '../config/security';
import { Request, Response } from 'express';
import { sendError } from '../core/utils/response';

export const globalRateLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    return sendError(
      res,
      'Too many requests from this IP, please try again later.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    return sendError(
      res,
      'Too many authentication attempts, please try again after 15 minutes.',
      429,
      'AUTH_RATE_LIMIT_EXCEEDED'
    );
  },
});
