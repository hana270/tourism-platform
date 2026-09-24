import { Request, Response, NextFunction } from 'express';

export function debugMultipart(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  console.log('========== MULTIPART DEBUG ==========');
  console.log('METHOD:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('CONTENT-TYPE:', req.headers['content-type']);
  console.log('BODY:', req.body);
  console.log('FILES:', req.files);
  console.log('=====================================');

  next();
}