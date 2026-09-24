import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/ApiResponse';
import { CategoryService } from './category.service';

export const CategoryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const categories = await CategoryService.list(String(req.query.locale || 'fr'));
    return sendSuccess(res, categories, 'Categories fetched successfully');
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const category = await CategoryService.getById(req.params.id, String(req.query.locale || 'fr'));
    return sendSuccess(res, category);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const category = await CategoryService.create(req.body, files);
    return sendSuccess(res, category, 'Category created successfully', 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const category = await CategoryService.update(req.params.id, req.body, files);
    return sendSuccess(res, category, 'Category updated successfully');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await CategoryService.remove(req.params.id, req.auth?.userId);
    return sendSuccess(res, null, 'Category deleted successfully');
  }),
};
