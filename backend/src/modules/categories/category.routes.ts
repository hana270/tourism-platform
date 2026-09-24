import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { uploadCategoryImages } from '@/middlewares/upload';
import { CategoryController } from './category.controller';
import { requireAuth, requireRole } from '@/middlewares/auth';
import {
  createCategorySchema,
  idParamSchema,
  updateCategorySchema,
} from './category.validation';

const router = Router();

/**
 * @route   GET /api/v1/categories
 * @desc    Récupérer la liste complète des catégories
 * @access  Public / Admin
 */
router.get('/', CategoryController.list);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Récupérer une catégorie spécifique par son ID
 * @access  Public / Admin
 */
router.get('/:id', validate(idParamSchema), CategoryController.getById);

/**
 * @route   POST /api/v1/categories
 * @desc    Créer une nouvelle catégorie avec téléchargement d'images
 * @access  Admin
 *
 * NOTE IMPORTANTE :
 * `uploadCategoryImages` (Multer) doit IMPÉRATIVEMENT s'exécuter AVANT `validate(...)`.
 * Multer analyse le corps 'multipart/form-data' et remplit `req.body` et `req.files`.
 * Zod peut ensuite valider `req.body`.
 */
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'STAFF'),
  uploadCategoryImages,
  validate(createCategorySchema),
  CategoryController.create,
);

/**
 * @route   PATCH /api/v1/categories/:id
 * @desc    Mettre à jour une catégorie existante (données texte et/ou nouvelles images)
 * @access  Admin
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'STAFF'),
  uploadCategoryImages,
  validate(updateCategorySchema),
  CategoryController.update,
);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Supprimer une catégorie et ses images associées
 * @access  Admin
 */
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(idParamSchema), CategoryController.remove);

export default router;
