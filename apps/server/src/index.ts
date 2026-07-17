import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createOrder, captureOrder } from './paypal.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TalkHuman AI API is running' });
});

// PayPal: Create order
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }
    const order = await createOrder(plan);
    res.json(order);
  } catch (err: any) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PayPal: Capture order (after buyer approves)
app.post('/api/payments/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    const capture = await captureOrder(orderId);
    res.json(capture);
  } catch (err: any) {
    console.error('Capture order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend in production
const webDistPath = path.join(__dirname, '../../web/dist');
app.use(express.static(webDistPath));

// SPA fallback
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`TalkHuman AI server running on port ${port}`);
});