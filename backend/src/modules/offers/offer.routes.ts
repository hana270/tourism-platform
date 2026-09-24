import path from "path";
import fs from "fs/promises";
import { Router, Request, Response } from "express";
import { OfferStatus } from "@prisma/client";
import { z } from "zod";
import slugify from "slugify";
import multer from "multer";
import sharp from "sharp";
import { prisma } from "@/config/prisma";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { audit } from "@/lib/audit";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { translateToEnglish } from "@/lib/seo-translation";
import { Prisma, PromotionStatus } from "@prisma/client";
const router = Router();

/* ---------- Upload des images ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    if (!ok.includes(file.mimetype))
      return cb(
        ApiError.badRequest(`Format d'image non supporté : ${file.mimetype}`),
      );
    cb(null, true);
  },
}).array("images", 10);

router.post(
  "/upload-images",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  upload,
  asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw ApiError.badRequest("Aucune image reçue.");
    const dir = path.join(process.cwd(), "uploads", "offers");
    await fs.mkdir(dir, { recursive: true });
    const urls: string[] = [];
    for (const file of files) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
      await sharp(file.buffer)
        .rotate()
        .resize(1600, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(dir, filename));
      urls.push(`/uploads/offers/${filename}`);
    }
    res.status(201).json({ success: true, data: urls });
  }),
);

/* ---------- Validation ---------- */
const money = z.coerce.number().finite().nonnegative().max(999999999);
const optionalMoney = z
  .preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    money.nullable(),
  )
  .optional();

const photo = z.object({
  url: z.string().trim().min(1).max(500),
  isPrimary: z.boolean().default(false),
  altText: z.string().trim().max(160).nullable().optional(),
});

const offerInput = z
  .object({
    categoryId: z.string().min(1),
    zoneId: z.string().min(1),
    name: z.string().trim().min(2).max(180),
    description: z.string().trim().max(20000).nullable().optional(),
    status: z.enum(["PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
    address: z.string().trim().max(300).nullable().optional(),
    googleMapsUrl: z.string().trim().url().nullable().optional(),
    isHotel: z.coerce.boolean().default(false),
    stars: z
      .preprocess(
        (v) => (v === "" || v === undefined ? null : v),
        z.coerce.number().int().min(1).max(5).nullable(),
      )
      .optional(),
    price: optionalMoney,
    simplePrice: optionalMoney,
    halfBoardPrice: optionalMoney,
    allInclusivePrice: optionalMoney,
    fullBoardPrice: optionalMoney,
    photos: z.array(photo).max(30).default([]),
    availabilityOnDemand: z.coerce.boolean().default(false),
    customFields: z
      .array(
        z.object({
          fieldName: z.string().trim().min(1).max(120),
          value: z.string().trim().min(1).max(3000),
        }),
      )
      .max(30)
      .default([]),
  })
  .superRefine((v, ctx) => {
    if (v.isHotel) {
      if (v.simplePrice == null)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["simplePrice"],
          message: "Le prix logement simple est obligatoire pour un hôtel.",
        });
    } else if (v.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Le prix est obligatoire.",
      });
    }
  });
type OfferInput = z.infer<typeof offerInput>;

const include: Prisma.OfferInclude = {
  category: true,

  zone: true,

  photos: {
    orderBy: {
      isPrimary: "desc",
    },
  },

  customFields: {
    orderBy: {
      id: "asc",
    },
  },

  promotions: {
    where: {
      status: {
        not: PromotionStatus.EXPIRED,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  },
};

function normalizePhotos(input: OfferInput) {
  const list = input.photos.map((p) => ({
    url: p.url,
    isPrimary: p.isPrimary,
    altText: p.altText ?? input.name,
  }));
  if (list.length > 0 && !list.some((p) => p.isPrimary))
    list[0].isPrimary = true;
  return list;
}

function baseData(input: OfferInput) {
  const hotel = input.isHotel;
  return {
    categoryId: input.categoryId,
    zoneId: input.zoneId,
    name: input.name,
    description: input.description || null,
    status: input.status as OfferStatus,
    address: input.address || null,
    googleMapsUrl: input.googleMapsUrl || null,
    isHotel: hotel,
    stars: hotel ? (input.stars ?? null) : null,
    simplePrice: hotel ? (input.simplePrice ?? null) : null,
    halfBoardPrice: hotel ? (input.halfBoardPrice ?? null) : null,
    allInclusivePrice: hotel ? (input.allInclusivePrice ?? null) : null,
    fullBoardPrice: hotel ? (input.fullBoardPrice ?? null) : null,
    availabilityOnDemand: input.availabilityOnDemand,
    price: hotel ? (input.simplePrice as number) : (input.price as number),
  };
}

async function assertRefs(input: OfferInput) {
  if (!(await prisma.category.findUnique({ where: { id: input.categoryId } })))
    throw ApiError.badRequest("La catégorie sélectionnée n’existe pas.");
  if (!(await prisma.zone.findUnique({ where: { id: input.zoneId } })))
    throw ApiError.badRequest("La zone sélectionnée n’existe pas.");
}

/* ---------- Traduction persistée : aucune attente DeepL à la lecture ---------- */
function localize<
  T extends {
    name: string;
    nameEn: string | null;
    description: string | null;
    descriptionEn: string | null;
    address: string | null;
    addressEn: string | null;
  },
>(offer: T, req: Request) {
  const locale = String(req.query.locale || req.query.lang || "fr");
  return locale === "en"
    ? {
        ...offer,
        name: offer.nameEn || offer.name,
        description: offer.descriptionEn || offer.description,
        address: offer.addressEn || offer.address,
      }
    : offer;
}

async function translatedFields(input: OfferInput) {
  const [nameEn, descriptionEn, addressEn] = await Promise.all([
    translateToEnglish(input.name),
    input.description
      ? translateToEnglish(input.description)
      : Promise.resolve(null),
    input.address ? translateToEnglish(input.address) : Promise.resolve(null),
  ]);
  return { nameEn, descriptionEn, addressEn };
}

/* ---------- Routes ---------- */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const offers = await prisma.offer.findMany({
      where: {
        ...(req.query.status
          ? { status: String(req.query.status) as OfferStatus }
          : {}),
        ...(req.query.zoneId ? { zoneId: String(req.query.zoneId) } : {}),
        ...(req.query.categoryId
          ? { categoryId: String(req.query.categoryId) }
          : {}),
      },
      include,
      orderBy: { createdAt: "desc" },
    });
    res.json({
      success: true,
      data: await Promise.all(offers.map((offer) => localize(offer, req))),
    });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include,
    });
    if (!offer) throw ApiError.notFound("Offre introuvable.");
    res.json({ success: true, data: await localize(offer, req) });
  }),
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const input = offerInput.parse(req.body);
    await assertRefs(input);
    const slug = slugify(`${input.name}-${Date.now()}`, {
      lower: true,
      strict: true,
      trim: true,
    });
    const data = await prisma.offer.create({
      data: {
        ...baseData(input),
        ...(await translatedFields(input)),
        slug,
        photos: { create: normalizePhotos(input) },
        customFields: { create: input.customFields },
      },
      include,
    });
    await audit(req.auth!.userId, "CREATE", "Offer", data.id, {
      name: data.name,
    });
    res.status(201).json({ success: true, data });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const input = offerInput.parse(req.body);
    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Offre introuvable.");
    await assertRefs(input);
    const data = await prisma.$transaction(async (tx) => {
      await tx.offerPhoto.deleteMany({ where: { offerId: id } });
      await tx.offerPhoto.createMany({
        data: normalizePhotos(input).map((p) => ({ ...p, offerId: id })),
      });
      await tx.offerCustomField.deleteMany({ where: { offerId: id } });
      if (input.customFields.length) {
        await tx.offerCustomField.createMany({
          data: input.customFields.map((field) => ({ ...field, offerId: id })),
        });
      }
      return tx.offer.update({
        where: { id },
        data: {
          ...baseData(input),
          ...(await translatedFields(input)),
          slug: slugify(`${input.name}-${id}`, { lower: true, strict: true }),
        },
        include,
      });
    });
    await audit(req.auth!.userId, "UPDATE", "Offer", id, { name: data.name });
    res.json({ success: true, data });
  }),
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = z
      .object({ status: z.enum(["PUBLISHED", "ARCHIVED"]) })
      .parse(req.body);
    const data = await prisma.offer.update({
      where: { id: req.params.id },
      data: { status },
      include,
    });
    await audit(req.auth!.userId, "STATUS_CHANGE", "Offer", data.id, {
      status,
    });
    res.json({ success: true, data });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { photos: true },
    });
    if (!offer) throw ApiError.notFound("Offre introuvable.");
    const uploadRoot = path.resolve(process.cwd(), "uploads");
    await prisma.offer.delete({ where: { id: req.params.id } });
    await Promise.all(
      offer.photos.map(async (photo) => {
        if (!photo.url.startsWith("/uploads/")) return;
        const filePath = path.resolve(
          uploadRoot,
          photo.url.replace(/^\/uploads\//, ""),
        );
        if (filePath.startsWith(uploadRoot + path.sep)) {
          await fs.rm(filePath, { force: true });
        }
      }),
    );
    await audit(req.auth!.userId, "DELETE", "Offer", offer.id, {
      name: offer.name,
    });
    res.json({ success: true, data: null });
  }),
);

export default router;
