import { Router } from 'express';
import categoryRoutes from '@/modules/categories/category.routes';
import authRoutes from '@/modules/auth/auth.routes';
import offerRoutes from '@/modules/offers/offer.routes';
import settingsRoutes from '@/modules/settings/settings.routes';
import zoneRoutes from '@/modules/zones/zone.routes';
import analyticsRoutes from '@/modules/analytics/analytics.routes';
import reservationRoutes from '@/modules/reservations/reservation.routes';
import promotionRoutes from '@/modules/promotions/promotion.routes';
import availabilityRoutes from '@/modules/availability/availability.routes';
import insightsRoutes from '@/modules/insights/insights.routes';
import { invalidateOnWrite, publicCache } from '@/middlewares/publicCache';

const router = Router();

// Lectures publiques mises en cache quelques secondes ; toute modification vide le cache.
router.use(invalidateOnWrite);

router.use('/auth', authRoutes);
router.use('/categories', publicCache(60), categoryRoutes);
router.use('/offers', publicCache(45), offerRoutes);
router.use('/settings', publicCache(60), settingsRoutes);
router.use('/zones', publicCache(60), zoneRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reservations', reservationRoutes);
router.use('/promotions', promotionRoutes);
router.use('/availability', publicCache(10), availabilityRoutes);
router.use('/insights', insightsRoutes);
// router.use('/settings/contact', contactSettingsRoutes);
// router.use('/settings/homepage', homepageSettingsRoutes);
// router.use('/admin', adminRoutes);

export default router;
