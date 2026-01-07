# Polylitics

A Polymarket analytics tool for detecting trading opportunities based on deadline delay risk, price/volume spikes, and probability modeling.

## Features

- 📊 **Market Scanner** - Browse and filter all active Polymarket markets
- 📈 **Top Movers** - Detect price and volume spikes with attention scoring
- ⏰ **Deadline Analysis** - Analyze "by-date" markets for delay risk
- 💡 **Opportunities** - High-edge market recommendations based on probability models
- ⭐ **Watchlist** - Track specific markets (coming soon)
- 🔔 **Alerts** - Configure notifications (coming soon)

## How It Works

### The Core Insight

On Polymarket, positions trade like stocks - you can enter and exit before resolution. The value of a YES token at $0.30 can rise to $0.45 before the event even happens, based on:

- News breaking
- Attention/volume increasing  
- Sentiment shifting

### The Analytics Edge

This tool helps you:

1. **Spot "by-date" markets** - Markets with deadlines (e.g., "Will X happen by March 31?")
2. **Calculate delay risk** - Historical data shows deadline markets often overestimate on-time completion
3. **Detect attention spikes** - Volume/price changes before the crowd arrives
4. **Model edge** - Compare market probability vs. delay-adjusted probability

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DIRECT_URL` | Direct PostgreSQL URL (for Prisma) | Yes |
| `NEXT_PUBLIC_BASE_URL` | App URL for server-side API calls | Yes |
| `POLYMARKET_API_URL` | Polymarket API base URL | No |

## Usage

### 1. Ingest Markets

First, ingest markets from Polymarket:

```bash
curl -X POST http://localhost:3000/api/polymarket/ingest
```

Or set up a cron job to run this every 5-15 minutes.

### 2. View Dashboard

Open http://localhost:3000 to see the main dashboard.

### 3. Explore Features

- **/scanner** - Browse all markets
- **/movers** - See price/volume spikes
- **/deadlines** - Analyze deadline markets
- **/opportunities** - View high-edge opportunities

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/polymarket/ingest` | POST | Fetch and store markets from Polymarket |
| `/api/polymarket/markets` | GET | List markets with optional filters |
| `/api/polymarket/movers` | GET | Get markets with significant movement |
| `/api/polymarket/deadlines` | GET | Get deadline markets with urgency analysis |
| `/api/polymarket/score` | GET | Get scored markets by edge |
| `/api/polymarket/stats` | GET | Get dashboard statistics |

## The Models

### Deadline Delay Model

Markets asking "will X happen by DATE" are systematically mispriced because:

- Traders price intent instead of process
- Multiple procedural steps each have delay risk
- Compounding: if 4 steps each have 90% on-time chance, overall = 0.9^4 = 65%

### Attention Score

Combines:
- Volume (40% weight)
- Price change (40% weight)  
- Liquidity (20% weight)

Higher attention = market is being noticed.

### Volume Spike Detection

Uses z-score against 7-day baseline. Z > 2.0 = spike detected.

## Strategy Ideas

### Deadline Delay

1. Find markets with tight deadlines (< 30 days)
2. Check if procedural steps remain
3. If market probability is high but steps are incomplete → potential NO value

### Attention Arbitrage

1. Watch for low-attention markets
2. Track for early volume increases
3. Enter before crowd arrives
4. Exit into volume spike

## Disclaimer

This is an analytics tool, not financial advice. Prediction market trading involves risk. Only trade what you can afford to lose.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS

## License

MIT
