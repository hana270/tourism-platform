import multer from "multer";
import type { Request } from "express";
import { ApiError } from "@/utils/ApiError";
import type { FileFilterCallback } from "multer";

const MAX_FILE_SIZE_MB = 15;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const storage = multer.memoryStorage();

export const uploadCategoryImages = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
 fileFilter: (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      ApiError.badRequest(
        `Format d'image non supporté : ${file.mimetype}`,
      ),
    );
  }

  cb(null, true);
},


}).array("images", 1);
