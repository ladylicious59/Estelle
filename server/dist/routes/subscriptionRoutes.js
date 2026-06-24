import { Router } from 'express';
// import * as subscriptionController from '../controllers/subscriptionController.js';
const router = Router();
router.get('/me', (req, res) => {
    res.json({ plan: 'free', status: 'active' });
});
router.post('/create-checkout-session', (req, res) => {
    res.json({ url: 'https://checkout.stripe.com/mock-session' });
});
export default router;
