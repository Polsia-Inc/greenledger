# GreenLedger — AASB S2 Climate Disclosure Reports

AI-powered AASB S2 (IFRS S2 aligned) climate disclosure report generator for Australian businesses. Enter your company details and emissions data, and GreenLedger produces a full compliance report covering Governance, Strategy, Risk Management, and Metrics & Targets.

## Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **AI**: OpenAI GPT-4o (configurable)
- **Deployment**: Vercel (serverless) or any Node.js host

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/know-whats-on/greenledger.git
cd greenledger
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → your project
2. Navigate to **Settings → Database → Connection string**
3. Copy the **URI** (Transaction pooler recommended for Vercel)

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for report generation |
| `OPENAI_MODEL` | | Model to use (default: `gpt-4o`) |
| `PORT` | | Server port (default: `3000`) |
| `NODE_ENV` | | Environment (default: `development`) |

### 4. Run migrations

```bash
npm run migrate
```

This creates three tables in your Supabase database:
- `companies` — Company profiles
- `emissions_data` — Emission line items (Scope 1/2/3)
- `reports` — Generated AASB S2 reports

> ⚠️ Migrations use `IF NOT EXISTS` — they're safe to run multiple times and won't touch existing data.

### 5. Start locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option A: One-click (recommended)

1. Push this repo to your GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → Import your repo
3. Add environment variables:
   - `DATABASE_URL` = your Supabase connection string
   - `OPENAI_API_KEY` = your OpenAI key
   - `OPENAI_MODEL` = `gpt-4o` (optional)
4. Deploy

Vercel will automatically run migrations on each deploy via the `vercel-build` script.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

Set env vars in Vercel dashboard or via CLI:
```bash
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (includes DB status) |
| `GET` | `/api/emission-factors` | List available emission factors |
| `POST` | `/api/companies` | Create a company |
| `GET` | `/api/companies` | List all companies |
| `GET` | `/api/companies/:id` | Get a company |
| `POST` | `/api/companies/:id/emissions` | Add emissions data |
| `GET` | `/api/companies/:id/emissions` | List emissions for company |
| `DELETE` | `/api/emissions/:id` | Delete an emission record |
| `POST` | `/api/companies/:id/reports/generate` | Generate AASB S2 report |
| `GET` | `/api/companies/:id/reports` | List reports for company |
| `GET` | `/api/reports/:id` | Get full report |
| `GET` | `/api/reports/:id/html` | Get report as HTML (for printing) |

## Emission Factors

Uses Australian National Greenhouse Accounts (NGA) factors from DCEEW:

- **Scope 1**: Natural gas, diesel, petrol, LPG, fleet vehicles, refrigerants
- **Scope 2**: Grid electricity by state (NSW, VIC, QLD, SA, WA, TAS, NT, national average)
- **Scope 3**: Air travel, employee commute, waste, water, paper

## Project Structure

```
├── server.js                  # Express app + API routes
├── migrate.js                 # Database migration runner
├── migrations/                # SQL migrations (timestamped)
├── lib/
│   ├── ai.js                  # OpenAI integration
│   ├── emission-factors.js    # NGA emission factors
│   └── report-generator.js    # AASB S2 report builder
├── public/
│   ├── index.html             # Landing page
│   └── app.html               # React dashboard (SPA)
├── vercel.json                # Vercel deployment config
├── .env.example               # Environment variable template
└── package.json
```

## License

Private. All rights reserved.
