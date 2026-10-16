import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../core/errors/AppError';
import { sendError } from '../core/utils/response';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', issues);
  }

  // Prisma unique constraint violation (P2002)
  if ('code' in err && (err as { code: string }).code === 'P2002') {
    const meta = (err as { meta?: { target?: string[] } }).meta;
    return sendError(
      res,
      `A unique constraint was violated on fields: ${meta?.target?.join(', ') || 'unknown'}`,
      409,
      'CONFLICT',
      meta
    );
  }

  // Prisma record not found (P2025)
  if ('code' in err && (err as { code: string }).code === 'P2025') {
    return sendError(res, 'Requested database record was not found', 404, 'NOT_FOUND');
  }

  console.error('[Unhandled Server Error]:', err);

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR', env.NODE_ENV === 'development' ? err.stack : undefined);
}
