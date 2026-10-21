import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import type { Logger } from 'pino';
import { AppError } from '../lib/errors';

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check your input.',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
        error: {
          code: 'INVALID_UPLOAD',
          message: 'Attach one JPEG, PNG or WebP receipt, at most 2 MB.',
        },
      });
      return;
    }
    if (error instanceof AppError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      ['entity.parse.failed', 'entity.too.large'].includes(String(error.type))
    ) {
      res.status(error.type === 'entity.too.large' ? 413 : 400).json({
        error: { code: 'INVALID_BODY', message: 'Request body is invalid or too large.' },
      });
      return;
    }
    logger.error({ err: error, requestId: req.id }, 'Request failed');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
  };
}
