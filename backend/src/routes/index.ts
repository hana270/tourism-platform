import { Router } from 'express';
import categoryRoutes from '@/modules/categories/category.routes';
import authRoutes from '@/modules/auth/auth.routes';
import offerRoutes from '@/modules/offers/offer.routes';
import settingsRoutes from '@/modules/settings/settings.routes';
import zoneRoutes from '@/modules/zones/zone.routes';
import analyticsRoutes from '@/modules/analytics/analytics.routes';
import reservationRoutes from '@/modules/reservations/reservation.routes';
import availabilityRoutes from '@/modules/availability/availability.routes';
import promotionRoutes from '@/modules/promotions/promotion.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/offers', offerRoutes);
router.use('/settings', settingsRoutes);
router.use('/zones', zoneRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reservations', reservationRoutes);
router.use('/availability', availabilityRoutes);
router.use('/promotions', promotionRoutes);
// router.use('/settings/contact', contactSettingsRoutes);
// router.use('/settings/homepage', homepageSettingsRoutes);
// router.use('/admin', adminRoutes);

export default router;
