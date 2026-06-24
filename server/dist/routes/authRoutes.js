import { Router } from 'express';
// import * as authController from '../controllers/authController.js';
const router = Router();
// Mock auth for now
router.post('/signup', (req, res) => {
    res.json({ message: 'Signup endpoint placeholder' });
});
router.post('/login', (req, res) => {
    res.json({ message: 'Login endpoint placeholder' });
});
export default router;
