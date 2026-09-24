import multer from 'multer';
import { ApiError } from '@/utils/ApiError';

const MAX_FILE_SIZE_MB = 15; // l'admin peut envoyer une photo lourde, on compresse après
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const storage = multer.memoryStorage();

export const uploadCategoryImages = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Format d'image non supporté : ${file.mimetype}`));
    }
    cb(null, true);
  },
}).array('images', 1); // Une seule couverture dans l'interface actuelle; le modèle CategoryImage reste multi-image pour une évolution future.
