import { Request, Response } from 'express';
import { stripe, STRIPE_PLANS } from '../config/stripe.js';
import { db } from '../config/database.js';

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { plan, userId, userEmail } = req.body;

  if (!plan || !userId || !userEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const selectedPlan = STRIPE_PLANS[plan.toUpperCase() as keyof typeof STRIPE_PLANS];

  if (!selectedPlan) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
      customer_email: userEmail,
      metadata: {
        userId,
        plan,
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSubscriptionStatus = async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as any;

    if (!subscription) {
      return res.json({ plan: 'none', status: 'inactive' });
    }

    res.json({
      plan: subscription.plan,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as any;

    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    db.prepare('UPDATE subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .run('canceling', userId);

    res.json({ message: 'Subscription will be canceled at the end of the current period' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
