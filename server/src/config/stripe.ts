import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any, // Use a recent version
});

export const STRIPE_PLANS = {
  STARTER: {
    name: 'Starter',
    price: 19,
    id: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
  },
  PRO: {
    name: 'Pro',
    price: 49,
    id: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder',
  },
  AGENCY: {
    name: 'Agency',
    price: 149,
    id: process.env.STRIPE_PRICE_AGENCY || 'price_agency_placeholder',
  },
};
