import { Router, Request, Response } from "express";
import { Prisma, ReservationStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "@/config/prisma";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { audit } from "@/lib/audit";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { env } from "@/config/env";
import { isFull } from "@/lib/occupancy";
import { PRICE_TYPES, effectiveUnitPrice } from "@/modules/promotions/promotion.service";

const router = Router();

/* ------------------------------------------------------------------ */
/*  Règles métier                                                      */
/*                                                                    */
/*  • Une demande client est toujours créée « En attente » : elle ne   */
/*    bloque AUCUNE date. Plusieurs clients peuvent donc demander la   */
/*    même date, pour la même offre ou pour des offres différentes.    */
/*  • Quand l'administrateur CONFIRME, la période [arrivée, départ[    */
/*    est bloquée pour cette offre (le jour de départ reste libre).    */
/*    Si une autre réservation confirmée occupe déjà ces dates, la     */
/*    confirmation est refusée avec le nom du client en conflit.       */
/*  • Annuler / remettre en attente libère immédiatement les dates.    */
/*  • Le paiement est suivi à part : il ne conditionne plus le blocage. */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const todayUTC = () => new Date(new Date().toISOString().slice(0, 10));
const dayString = (d: Date) => d.toISOString().slice(0, 10);

/** Statuts pour lesquels les dates sont réservées sur le calendrier. */
const BLOCKING: ReservationStatus[] = ["CONFIRMED", "COMPLETED"];
const isBlocking = (s: ReservationStatus) => BLOCKING.includes(s);

/** Transitions autorisées depuis chaque statut. */
const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONTACTED", "CONFIRMED", "CANCELLED"],
  CONTACTED: ["PENDING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "PENDING", "CANCELLED"],
  COMPLETED: ["CONFIRMED"],
  CANCELLED: ["PENDING"],
};

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Trop de demandes. Réessayez dans quelques minutes." },
});

const date = z.coerce.date();
const baseFields = {
  offerId: z.string().min(1),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(6).max(40),
  customerEmail: z.string().email().optional().or(z.literal("")),
  startDate: date,
  endDate: date,
  guests: z.coerce.number().int().min(1).max(1000),
  notes: z.string().trim().max(2000).optional(),
  // Formule choisie (hôtels). Le prix est TOUJOURS recalculé par le serveur.
  priceType: z.enum(PRICE_TYPES).optional(),
};

/** Le départ peut être égal à l'arrivée (service d'une journée) : il devient alors J+1. */
function normalizeRange(start: Date, end: Date) {
  return { startDate: start, endDate: end.getTime() === start.getTime() ? addDays(start, 1) : end };
}

const createSchema = z
  .object(baseFields)
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "La date de fin doit être postérieure à la date de début.",
  })
  .refine((v) => v.startDate >= todayUTC(), {
    path: ["startDate"],
    message: "La date d’arrivée ne peut pas être dans le passé.",
  });

/** Réservation saisie par l'équipe (appel téléphone, client au comptoir…). */
const manualSchema = z
  .object({
    ...baseFields,
    status: z.nativeEnum(ReservationStatus).default("CONFIRMED"),
    paymentStatus: z.nativeEnum(PaymentStatus).default("NOT_PAID"),
    adminNotes: z.string().trim().max(3000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "La date de fin doit être postérieure à la date de début.",
  });

const updateSchema = z.object({
  status: z.nativeEnum(ReservationStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  adminNotes: z.string().trim().max(3000).nullable().optional(),
});

type Tx = Prisma.TransactionClient;

/**
 * Cherche ce qui empêche la période : une réservation confirmée (studio, appartement, activité)
 * ou, pour un hôtel, l'absence de chambre libre (toutes les chambres déjà confirmées).
 */
async function findConflict(tx: Tx, offerId: string, start: Date, end: Date, excludeReservationId?: string) {
  const offer = await tx.offer.findUnique({ where: { id: offerId }, select: { isHotel: true, roomCount: true } });
  if (!offer) return null;
  const blocks = await tx.availabilityBlock.findMany({
    where: {
      offerId,
      startDate: { lt: end },
      endDate: { gt: start },
      ...(excludeReservationId
        ? { OR: [{ reservationId: null }, { reservationId: { not: excludeReservationId } }] }
        : {}),
    },
    include: {
      reservation: { select: { id: true, customerName: true, startDate: true, endDate: true } },
    },
  });
  if (!isFull(offer, blocks, start, end)) return null;
  return { block: blocks[0], hotel: offer.isHotel };
}

function conflictError(c: NonNullable<Awaited<ReturnType<typeof findConflict>>>) {
  if (c.hotel) {
    return ApiError.conflict("Toutes les chambres de cet hôtel sont déjà réservées sur ces dates.", {
      conflictReservationId: c.block.reservation?.id ?? null,
    });
  }
  const who = c.block.reservation?.customerName;
  const period = `${dayString(c.block.startDate)} → ${dayString(c.block.endDate)}`;
  return ApiError.conflict(
    who
      ? `Dates déjà confirmées pour ${who} (${period}). Annulez cette réservation ou choisissez d’autres dates.`
      : `Ces dates sont déjà bloquées (${period}).`,
    { conflictReservationId: c.block.reservation?.id ?? null },
  );
}

/** Aligne le blocage de dates sur le statut de la réservation. */
async function syncBlock(
  tx: Tx,
  r: { id: string; offerId: string; status: ReservationStatus; startDate: Date | null; endDate: Date | null },
) {
  const current = await tx.availabilityBlock.findFirst({
    where: { reservationId: r.id },
    select: { id: true },
  });
  const mustBlock = isBlocking(r.status) && !!r.startDate && !!r.endDate;
  if (mustBlock && !current) {
    const conflict = await findConflict(tx, r.offerId, r.startDate!, r.endDate!, r.id);
    if (conflict) throw conflictError(conflict);
    await tx.availabilityBlock.create({
      data: { offerId: r.offerId, startDate: r.startDate!, endDate: r.endDate!, reservationId: r.id },
    });
  } else if (!mustBlock && current) {
    await tx.availabilityBlock.deleteMany({ where: { reservationId: r.id } });
  }
}

const offerSummary = {
  select: {
    id: true,
    name: true,
    slug: true,
    price: true,
    priceUnit: true,
    isHotel: true,
    roomCount: true,
    zone: { select: { name: true } },
    photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
  },
} as const;

/* ------------------------------ Liste ------------------------------ */

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status ? (String(req.query.status) as ReservationStatus) : undefined;
    const offerId = req.query.offerId ? String(req.query.offerId) : undefined;
    const q = req.query.q ? String(req.query.q).trim() : "";
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const rows = await prisma.reservation.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(offerId ? { offerId } : {}),
        ...(from && !isNaN(+from) ? { endDate: { gte: from } } : {}),
        ...(to && !isNaN(+to) ? { startDate: { lte: to } } : {}),
        ...(q
          ? {
              OR: [
                { customerName: { contains: q, mode: "insensitive" as const } },
                { customerPhone: { contains: q } },
                { customerEmail: { contains: q, mode: "insensitive" as const } },
                { offer: { name: { contains: q, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      include: { offer: offerSummary },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Pour les demandes encore ouvertes : y a-t-il déjà une réservation confirmée sur ces dates ?
    const open = rows.filter(
      (r) => (r.status === "PENDING" || r.status === "CONTACTED") && r.startDate && r.endDate,
    );
    const blocks = open.length
      ? await prisma.availabilityBlock.findMany({
          where: {
            offerId: { in: [...new Set(open.map((r) => r.offerId))] },
            endDate: { gt: new Date(Math.min(...open.map((r) => r.startDate!.getTime()))) },
            startDate: { lt: new Date(Math.max(...open.map((r) => r.endDate!.getTime()))) },
          },
          include: { reservation: { select: { customerName: true } } },
        })
      : [];

    const data = rows.map((r) => {
      let hit: (typeof blocks)[number] | undefined;
      if (open.includes(r)) {
        const same = blocks.filter((b) => b.offerId === r.offerId && b.reservationId !== r.id && b.startDate < r.endDate! && b.endDate > r.startDate!);
        if (isFull(r.offer, same, r.startDate!, r.endDate!)) hit = same[0];
      }
      return {
        ...r,
        conflict: !!hit,
        conflictWith: hit
          ? { customerName: hit.reservation?.customerName ?? null, startDate: hit.startDate, endDate: hit.endDate, hotel: r.offer.isHotel }
          : null,
      };
    });
    res.json({ success: true, data });
  }),
);

/* --------------------------- Statistiques --------------------------- */

router.get(
  "/stats",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (_req: Request, res: Response) => {
    const today = todayUTC();
    const [grouped, arrivalsToday, departuresToday, upcoming] = await Promise.all([
      prisma.reservation.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.reservation.count({ where: { status: "CONFIRMED", startDate: today } }),
      prisma.reservation.count({ where: { status: "CONFIRMED", endDate: today } }),
      prisma.reservation.count({
        where: { status: "CONFIRMED", startDate: { gte: today, lte: addDays(today, 7) } },
      }),
    ]);
    const byStatus: Record<string, number> = {
      PENDING: 0,
      CONTACTED: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    grouped.forEach((g) => (byStatus[g.status] = g._count._all));
    res.json({
      success: true,
      data: {
        byStatus,
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
        arrivalsToday,
        departuresToday,
        upcoming,
      },
    });
  }),
);

/* ---------------------------- Calendrier ---------------------------- */
/** Toutes les réservations non annulées qui touchent la fenêtre [from, to]. */
router.get(
  "/calendar",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const q = z
      .object({
        from: z.coerce.date(),
        to: z.coerce.date(),
        offerId: z.string().optional(),
      })
      .parse(req.query);
    const rows = await prisma.reservation.findMany({
      where: {
        status: { not: "CANCELLED" },
        startDate: { lte: q.to },
        endDate: { gte: q.from },
        ...(q.offerId ? { offerId: q.offerId } : {}),
      },
      select: {
        id: true,
        offerId: true,
        customerName: true,
        customerPhone: true,
        guests: true,
        status: true,
        paymentStatus: true,
        startDate: true,
        endDate: true,
        offer: { select: { id: true, name: true, isHotel: true, roomCount: true } },
      },
      orderBy: { startDate: "asc" },
      take: 1500,
    });
    res.json({ success: true, data: rows });
  }),
);

/* ----------------------------- Détail ------------------------------ */

router.get(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { offer: offerSummary },
    });
    if (!row) throw ApiError.notFound("Demande de réservation introuvable.");
    const history = await prisma.auditLog.findMany({
      where: { entity: "Reservation", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    res.json({ success: true, data: { ...row, history } });
  }),
);

/* ---------------------- Création (visiteur) ------------------------ */

router.post(
  "/",
  createLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const input = createSchema.parse(req.body);
    const offer = await prisma.offer.findUnique({
      where: { id: input.offerId },
      select: {
        id: true, status: true, isHotel: true, price: true,
        simplePrice: true, halfBoardPrice: true, fullBoardPrice: true, allInclusivePrice: true,
      },
    });
    if (!offer || offer.status !== "PUBLISHED") throw ApiError.notFound("Offre introuvable.");
    const { startDate, endDate } = normalizeRange(input.startDate, input.endDate);

    // Formule : un hôtel exige un choix valide ; les autres offres n'ont qu'un prix (BASE).
    const priceType = offer.isHotel ? input.priceType : "BASE";
    if (offer.isHotel && (!priceType || priceType === "BASE")) throw ApiError.badRequest("Choisissez une formule (logement seul, demi-pension…).");
    if (!offer.isHotel && input.priceType && input.priceType !== "BASE") throw ApiError.badRequest("Cette offre n’a qu’un seul prix.");
    const priced = await effectiveUnitPrice(offer, priceType ?? "BASE");
    if (offer.isHotel && priced.unit == null) throw ApiError.badRequest("Cette formule n’est pas proposée.");

    // Seules les réservations CONFIRMÉES bloquent : une simple demande n'empêche
    // personne d'autre de demander les mêmes dates.
    const conflict = await findConflict(prisma, input.offerId, startDate, endDate);
    if (conflict)
      throw ApiError.conflict("Cette offre est indisponible pendant la période sélectionnée.");

    // Anti-doublon : un double clic ou un renvoi ne crée pas une 2ᵉ demande (même offre, téléphone, dates, 15 min).
    const duplicate = await prisma.reservation.findFirst({
      where: {
        offerId: input.offerId,
        customerPhone: input.customerPhone,
        startDate,
        endDate,
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, startDate: true, endDate: true, guests: true, priceType: true, unitPrice: true },
    });
    if (duplicate) {
      res.status(200).json({ success: true, data: { ...duplicate, duplicate: true, offer: { id: offer.id } } });
      return;
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
        priceType: priceType ?? null,
        unitPrice: priced.unit,
      },
      include: { offer: { include: { category: true, zone: true } } },
    });

    // Notification serveur (template Meta) : OPTIONNELLE et désactivée par défaut, car le client envoie déjà
    // son message WhatsApp en un clic — l'administrateur ne doit pas recevoir deux messages.
    if (env.WHATSAPP_SERVER_NOTIFY === "true") {
      try {
        const contact = await prisma.siteSetting.findUnique({ where: { key: "whatsappNumero" }, select: { value: true } });
        if (contact?.value) {
          await sendWhatsAppTemplate(contact.value, [
            row.offer.name,
            row.offer.category?.name,
            row.offer.zone?.name,
            priced.unit != null ? `${priced.unit} TND (${priceType})` : `${Number(row.offer.price)} TND ${row.offer.priceUnit}`,
            row.offer.address,
            row.customerName,
            row.customerPhone,
            row.customerEmail,
            dayString(startDate),
            dayString(endDate),
            String(row.guests),
            row.notes,
            row.id,
          ]);
        }
      } catch (error) {
        console.error("Reservation WhatsApp notification failed:", error);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        guests: row.guests,
        priceType: row.priceType,
        unitPrice: row.unitPrice,
        offer: { id: row.offer.id, name: row.offer.name },
      },
    });
  }),
);

/* ------------------- Création manuelle (équipe) -------------------- */

router.post(
  "/manual",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const input = manualSchema.parse(req.body);
    const offer = await prisma.offer.findUnique({ where: { id: input.offerId }, select: { id: true } });
    if (!offer) throw ApiError.notFound("Offre introuvable.");
    const { startDate, endDate } = normalizeRange(input.startDate, input.endDate);

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
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
          adminNotes: input.adminNotes || null,
          status: input.status,
          paymentStatus: input.paymentStatus,
        },
      });
      await syncBlock(tx, created);
      return created;
    });
    await audit(req.auth!.userId, "CREATE_MANUAL", "Reservation", row.id, { status: row.status });
    res.status(201).json({ success: true, data: row });
  }),
);

/* ----------------------- Mise à jour (admin) ----------------------- */

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateSchema.parse(req.body);
    const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Demande de réservation introuvable.");

    if (input.status && input.status !== existing.status) {
      if (!TRANSITIONS[existing.status].includes(input.status)) {
        throw ApiError.badRequest(
          `Passage impossible de « ${existing.status} » à « ${input.status} ».`,
        );
      }
      if (input.status === "COMPLETED" && existing.endDate && existing.endDate > addDays(todayUTC(), 1)) {
        throw ApiError.badRequest("Le séjour n’est pas encore terminé.");
      }
    }

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: existing.id },
        data: input,
        include: { offer: offerSummary },
      });
      await syncBlock(tx, updated);
      return updated;
    });

    const changes: Record<string, string | null> = {};
    if (input.status && input.status !== existing.status) changes.status = `${existing.status} → ${input.status}`;
    if (input.paymentStatus && input.paymentStatus !== existing.paymentStatus)
      changes.paymentStatus = `${existing.paymentStatus} → ${input.paymentStatus}`;
    if (input.adminNotes !== undefined && input.adminNotes !== existing.adminNotes) changes.adminNotes = "modifiée";
    await audit(req.auth!.userId, "UPDATE", "Reservation", row.id, changes);

    res.json({ success: true, data: row });
  }),
);

/* ---------------------------- Suppression --------------------------- */

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Demande de réservation introuvable.");
    await prisma.$transaction([
      prisma.availabilityBlock.deleteMany({ where: { reservationId: existing.id } }),
      prisma.reservation.delete({ where: { id: existing.id } }),
    ]);
    await audit(req.auth!.userId, "DELETE", "Reservation", existing.id, { customer: existing.customerName });
    res.json({ success: true, data: { id: existing.id } });
  }),
);

export default router;
