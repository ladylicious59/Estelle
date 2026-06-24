import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { database } from './config/database.js';
import routes from './routes/index.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
// Middleware
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
// Webhook route (must be before standard express.json() if you were using it differently, 
// but here we integrated verify into express.json())
import { handleStripeWebhook } from './controllers/webhookController.js';
app.post('/api/webhooks/stripe', handleStripeWebhook);
// API Routes
app.use('/api', routes);
// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'TalkHuman AI API is running' });
});
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    // Initialize database
    try {
        database.init();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
    }
});
