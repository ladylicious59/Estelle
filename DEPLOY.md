# Deployment Guide - TalkHuman AI

## Deployment Platform: Railway

We recommend [Railway](https://railway.app) for its simplicity and support for Node.js with SQLite.

### Steps to Deploy

1. **Connect Repository**: Link your GitHub repository to Railway.
2. **Environment Variables**: Configure the following environment variables in the Railway dashboard:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key.
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret.
   - `STRIPE_PRICE_STARTER`: Stripe Price ID for Starter tier.
   - `STRIPE_PRICE_PRO`: Stripe Price ID for Pro tier.
   - `STRIPE_PRICE_AGENCY`: Stripe Price ID for Agency tier.
   - `HEYGEN_API_KEY`: Your HeyGen API key.
   - `PORT`: 3000 (Railway usually provides this).
   - `NODE_ENV`: production.
   - `DB_PATH`: `./data/app.db` (Ensure the `data` directory exists or is created by the app).
3. **Build Command**: Railway should automatically detect the root `package.json` and use:
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **CORS Settings**: If you use a custom domain, ensure the `FRONTEND_URL` or allowed origins in `server/src/index.ts` allow your domain.

## Production Configuration

The server is configured to serve the built React frontend from `client/dist` when running in production.

- Health Check Endpoint: `/health`
- SPA Routing: All non-API requests are redirected to `index.html`.

## CI/CD Pipeline

A GitHub Actions workflow is configured in `.github/workflows/ci.yml` to:
- Run on every push and PR to `main`.
- Install dependencies for both client and server.
- Run linting for the client.
- Verify the build for both client and server.

## Local Build Verification

To verify the build locally before pushing:

```bash
npm run build
npm start
```

Then visit `http://localhost:3000` (or whatever `PORT` you set).
