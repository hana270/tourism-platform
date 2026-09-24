import { Router, Request, Response } from "express";
import slugify from "slugify";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { audit } from "@/lib/audit";
import { translateToEnglish } from "@/lib/seo-translation";

const router = Router();
const nameSchema = z.object({
  name: z.string().trim().min(2, "Le nom de la zone est obligatoire.").max(120),
});
const idSchema = z.string().min(1);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const zones = await prisma.zone.findMany({
      include: { _count: { select: { offers: true } } },
      orderBy: { name: "asc" },
    });
    const locale = String(req.query.locale || "fr");
    if (locale === "en")
      zones.forEach((zone) => {
        zone.name = zone.nameEn || zone.name;
      });
    res.json({ success: true, data: zones });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const zone = await prisma.zone.findUnique({
      where: { id: idSchema.parse(req.params.id) },
      include: {
        offers: {
          orderBy: { createdAt: "desc" },
          include: {
            category: {
              include: { translations: { where: { locale: "en" }, take: 1 } },
            },
          },
        },
        _count: { select: { offers: true } },
      },
    });
    if (!zone) throw ApiError.notFound("Zone géographique introuvable.");

    const locale = String(req.query.locale || "fr");
    if (locale !== "en") {
      res.json({ success: true, data: zone });
      return;
    }

    const localizedZone = {
      ...zone,
      name: zone.nameEn || zone.name,
      offers: zone.offers.map((offer) => ({
        ...offer,
        name: offer.nameEn || offer.name,
        description: offer.descriptionEn || offer.description,
        category: offer.category
          ? {
              ...offer.category,
              name: offer.category.translations[0]?.name || offer.category.name,
              description:
                offer.category.translations[0]?.description ||
                offer.category.description,
              translations: undefined,
            }
          : offer.category,
      })),
    };

    res.json({ success: true, data: localizedZone });
  }),
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const input = nameSchema.parse(req.body);
    const slug = slugify(input.name, { lower: true, strict: true, trim: true });
    const exists = await prisma.zone.findFirst({
      where: { OR: [{ name: input.name }, { slug }] },
    });
    if (exists) throw ApiError.conflict("Cette zone géographique existe déjà.");
    const zone = await prisma.zone.create({
      data: {
        name: input.name,
        nameEn: await translateToEnglish(input.name),
        slug,
      },
    });
    await audit(req.auth!.userId, "CREATE", "Zone", zone.id, {
      name: zone.name,
    });
    res.status(201).json({ success: true, data: zone });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = idSchema.parse(req.params.id);
    const input = nameSchema.parse(req.body);
    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone) throw ApiError.notFound("Zone géographique introuvable.");
    const slug = slugify(input.name, { lower: true, strict: true, trim: true });
    const duplicate = await prisma.zone.findFirst({
      where: { OR: [{ name: input.name }, { slug }], NOT: { id } },
    });
    if (duplicate)
      throw ApiError.conflict("Une autre zone utilise déjà ce nom.");
    const updated = await prisma.zone.update({
      where: { id },
      data: {
        name: input.name,
        nameEn: await translateToEnglish(input.name),
        slug,
      },
    });
    await audit(req.auth!.userId, "UPDATE", "Zone", id, { name: updated.name });
    res.json({ success: true, data: updated });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    const id = idSchema.parse(req.params.id);
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: { _count: { select: { offers: true } } },
    });
    if (!zone) throw ApiError.notFound("Zone géographique introuvable.");
    if (zone._count.offers > 0)
      throw ApiError.conflict(
        `Cette zone est liée à ${zone._count.offers} offre(s). Retirez ou réaffectez ces offres avant suppression.`,
      );
    await prisma.zone.delete({ where: { id } });
    await audit(req.auth!.userId, "DELETE", "Zone", id, { name: zone.name });
    res.json({ success: true, data: null });
  }),
);

export default router;
