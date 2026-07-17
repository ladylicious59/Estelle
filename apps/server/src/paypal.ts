import dotenv from 'dotenv';
dotenv.config();

// PayPal plan pricing
export const PAYPAL_PLANS: Record<string, { name: string; price: number }> = {
  starter: { name: 'Starter', price: 19 },
  pro: { name: 'Pro', price: 49 },
  agency: { name: 'Agency', price: 149 },
};

// PayPal REST API base URL
const PAYPAL_API = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json() as any;
  return data.access_token;
}

export async function createOrder(plan: string): Promise<{ id: string; approvalUrl: string }> {
  const selectedPlan = PAYPAL_PLANS[plan];
  if (!selectedPlan) throw new Error(`Invalid plan: ${plan}`);

  const accessToken = await getAccessToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        description: `TalkHuman AI - ${selectedPlan.name} Plan`,
        amount: {
          currency_code: 'USD',
          value: selectedPlan.price.toString(),
        },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?paypal=success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?paypal=cancel`,
          },
        },
      },
    }),
  });
  const order = await res.json() as any;
  const approvalLink = order.links?.find((l: any) => l.rel === 'payer-action')?.href || '';
  return { id: order.id, approvalUrl: approvalLink };
}

export async function captureOrder(orderId: string): Promise<any> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}