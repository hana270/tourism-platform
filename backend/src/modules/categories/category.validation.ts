import { z } from 'zod';

/**
 * Convertit les chaînes "true"/"false" issues de multipart/form-data en vrai booléen JS.
 */
const booleanCoerce = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val;
}, z.boolean().optional());

/**
 * Normalise 'keepImageIds' peu importe le format envoyé par le client :
 * - Chaîne JSON : '["id1", "id2"]'
 * - Valeurs séparées par des virgules : 'id1,id2'
 * - Champ unique : 'id1'
 * - Tableau standard : ['id1', 'id2']
 */
const keepImageIdsSchema = z
  .preprocess((val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          /* ignore */
        }
      }
      if (trimmed.includes(',')) {
        return trimmed.split(',').map((s) => s.trim());
      }
      return [trimmed];
    }
    return val;
  }, z.array(z.string()).optional())
  .optional();

export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(100),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    isActive: booleanCoerce.default(true),
    displayOrder: z.coerce.number().int().min(0).optional().default(0),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    isActive: booleanCoerce,
    displayOrder: z.coerce.number().int().min(0).optional(),
    keepImageIds: keepImageIdsSchema,
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];