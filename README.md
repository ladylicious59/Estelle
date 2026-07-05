# PersonaAI

Hyper-realistic AI video generation for social media content creators.

## Monorepo Structure

```
├── apps/
│   ├── web/          # Vite + React frontend (port 3000)
│   └── server/       # Node.js + Express API
├── packages/
│   ├── shared/       # Shared types and constants
│   └── database/     # Drizzle ORM schema + Turso SQLite client
└── docker-compose.yml
```

## Getting Started

```bash
npm install
npm run dev
```
