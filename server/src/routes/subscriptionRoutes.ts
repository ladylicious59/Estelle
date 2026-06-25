import { Router } from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';

const router = Router();

router.get('/status', subscriptionController.getSubscriptionStatus);
router.post('/create-checkout', subscriptionController.createCheckoutSession);
router.post('/cancel', subscriptionController.cancelSubscription);

export default router;
