import { Router } from 'express';
import videoRoutes from './videoRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import authRoutes from './authRoutes.js';
const router = Router();
router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);
router.use('/subscriptions', subscriptionRoutes);
export default router;
