/**
 * Crée (ou répare) le bucket PUBLIC des images dans Supabase Storage.
 * Usage : npm run storage:init
 */
import { ensurePublicBucket, STORAGE_BUCKET } from '../src/lib/storage';

ensurePublicBucket()
  .then((status) => console.log(`Bucket "${STORAGE_BUCKET}" : ${status}.`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
