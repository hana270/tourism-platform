import { Router, Request, Response } from "express";
import { ReservationStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "@/config/prisma";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { audit } from "@/lib/audit";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const router = Router();
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Trop de demandes. Réessayez dans quelques minutes." },
});
const date = z.coerce.date();
const createSchema = z
  .object({
    offerId: z.string().min(1),
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().min(6).max(40),
    customerEmail: z.string().email().optional().or(z.literal("")),
    startDate: date,
    endDate: date,
    guests: z.coerce.number().int().min(1).max(1000),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.endDate > v.startDate, {
    path: ["endDate"],
    message: "La date de fin doit être postérieure à la date de début.",
  })
  .refine((v) => v.startDate >= new Date(new Date().toISOString().slice(0, 10)), {
    path: ["startDate"],
    message: "La date d’arrivée ne peut pas être dans le passé.",
  });
const updateSchema = z.object({
  status: z.nativeEnum(ReservationStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  adminNotes: z.string().trim().max(3000).nullable().optional(),
});

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status
      ? (String(req.query.status) as ReservationStatus)
      : undefined;
    const rows = await prisma.reservation.findMany({
      where: { ...(status ? { status } : {}) },
      include: {
        offer: { select: { id: true, name: true, price: true, isHotel: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ success: true, data: rows });
  }),
);

router.post(
  "/",
  createLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const input = createSchema.parse(req.body);
    const offer = await prisma.offer.findUnique({
      where: { id: input.offerId },
      select: { id: true, availabilityOnDemand: true, name: true },
    });
    if (!offer) throw ApiError.notFound("Offre introuvable.");
    const startDate = input.startDate;
    const endDate = input.endDate;
    {
      const overlap = await prisma.availabilityBlock.findFirst({
        where: {
          offerId: input.offerId,
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });
      if (overlap)
        throw ApiError.conflict(
          "Cette offre est indisponible pendant la période sélectionnée.",
        );
    }
    const row = await prisma.reservation.create({
      data: {
        offerId: input.offerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail || null,
        bookingDate: startDate,
        startDate,
        endDate,
        guests: input.guests,
        notes: input.notes || null,
      },
      include: {
        offer: {
          include: { category: true, zone: true },
        },
      },
    });

    // Notification serveur vers le WhatsApp professionnel de l'administrateur,
    // via un template Meta pré-approuvé (voir @/lib/whatsapp).
    // La réservation reste valide même si WhatsApp est momentanément indisponible.
    try {
      const contact = await prisma.siteSetting.findUnique({
        where: { key: "whatsappNumero" },
        select: { value: true },
      });
      if (contact?.value) {
        await sendWhatsAppTemplate(contact.value, [
          row.offer.name,
          row.offer.category?.name,
          row.offer.zone?.name,
          `${Number(row.offer.price)} TND ${row.offer.priceUnit}`,
          row.offer.address,
          row.customerName,
          row.customerPhone,
          row.customerEmail,
          startDate.toISOString().slice(0, 10),
          endDate.toISOString().slice(0, 10),
          String(row.guests),
          row.notes,
          row.id,
        ]);
      }
    } catch (error) {
      console.error("Reservation WhatsApp notification failed:", error);
    }

    res.status(201).json({ success: true, data: row });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateSchema.parse(req.body);
    const existing = await prisma.reservation.findUnique({
      where: { id: req.params.id },
    });
    if (!existing)
      throw ApiError.notFound("Demande de réservation introuvable.");
    // Blocage automatique : les dates sont bloquées dès que la réservation est
    // CONFIRMÉE et PAYÉE, et libérées si l'une des deux conditions disparaît.
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: existing.id },
        data: input,
      });
      const mustBlock =
        updated.status === "CONFIRMED" &&
        updated.paymentStatus === "PAID" &&
        !!updated.startDate &&
        !!updated.endDate;
      const current = await tx.availabilityBlock.findFirst({
        where: { reservationId: updated.id },
        select: { id: true },
      });
      if (mustBlock && !current) {
        const overlap = await tx.availabilityBlock.findFirst({
          where: {
            offerId: updated.offerId,
            startDate: { lt: updated.endDate! },
            endDate: { gt: updated.startDate! },
          },
        });
        if (overlap)
          throw ApiError.conflict(
            "Ces dates sont déjà bloquées par une autre réservation confirmée et payée.",
          );
        await tx.availabilityBlock.create({
          data: {
            offerId: updated.offerId,
            startDate: updated.startDate!,
            endDate: updated.endDate!,
            reservationId: updated.id,
          },
        });
      } else if (!mustBlock && current) {
        await tx.availabilityBlock.deleteMany({
          where: { reservationId: updated.id },
        });
      }
      return updated;
    });
    await audit(req.auth!.userId, "UPDATE", "Reservation", row.id, input);
    res.json({ success: true, data: row });
  }),
);

export default router;
