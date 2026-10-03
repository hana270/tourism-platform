import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  COOKIE_DOMAIN: z.string().optional(),
  SESSION_COOKIE_NAME: z.string().default('ihost_session'),
  SESSION_DAYS: z.coerce.number().int().positive().default(7),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('uploads'),
  // Stockage persistant des images (Supabase Storage). OBLIGATOIRE : le disque
  // de Render/Vercel est éphémère, les images ne doivent plus y être écrites.
  SUPABASE_URL: z.string().url('SUPABASE_URL est obligatoire (ex: https://xxxx.supabase.co)'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY est obligatoire (clé service_role, jamais côté frontend)'),
  SUPABASE_BUCKET: z.string().min(1).default('media'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_GRAPH_VERSION: z.string().default('v23.0'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
