import { Request, Response } from 'express';
import { stripe } from '../config/stripe.js';
import { db } from '../config/database.js';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;

  try {
    // Stripe requires the raw body for signature verification
    event = stripe.webhooks.constructEvent((req as any).rawBody || req.body, sig!, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const userId = session.metadata.userId;
      const plan = session.metadata.plan;
      const stripeSubscriptionId = session.subscription;
      const stripeCustomerId = session.customer;

      // Update or insert subscription
      db.prepare(`
        INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          stripe_subscription_id = excluded.stripe_subscription_id,
          plan = excluded.plan,
          status = excluded.status,
          current_period_end = excluded.current_period_end,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        `sub_${Date.now()}`,
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        plan,
        'active',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Placeholder, should get from subscription object
      );
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      const status = subscription.status;
      const stripeSubscriptionId = subscription.id;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      db.prepare('UPDATE subscriptions SET status = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = ?')
        .run(status, currentPeriodEnd, stripeSubscriptionId);
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};
