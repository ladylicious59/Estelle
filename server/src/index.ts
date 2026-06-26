import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { database } from './config/database.js';
import routes from './routes/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json({
  verify: (req: any, res: any, buf: Buffer) => {
    req.rawBody = buf;
  }
}));
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier MVP deployment, can be hardened later
}));
app.use(cors());
app.use(morgan('dev'));

// Webhook route (must be before standard express.json() if you were using it differently, 
// but here we integrated verify into express.json())
import { handleStripeWebhook } from './controllers/webhookController.js';
app.post('/api/webhooks/stripe', handleStripeWebhook);

// API Routes
app.use('/api', routes);

// Serve static files from the React app in production
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TalkHuman AI API is running' });
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Initialize database
  try {
    database.init();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
});
