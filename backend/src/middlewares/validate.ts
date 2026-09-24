import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '@/utils/ApiError';

export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body ?? {},
        params: req.params,
        query: req.query,
      });

      // Zod retourne une nouvelle valeur pour z.coerce.number()/boolean().
      // Il faut la réinjecter, sinon req.body conserve les chaînes multipart.
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          ApiError.badRequest(
            'Validation failed',
            error.flatten().fieldErrors,
          ),
        );
      }

      next(error);
    }
  };
