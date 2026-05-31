import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  status?: number;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  console.error(`[Error] Status: ${status} | Message: ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  res.status(status).json({
    error: message,
    status: status
  });
};
