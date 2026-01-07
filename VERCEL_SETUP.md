# Vercel Deployment Setup

## Environment Variables Required

Add these environment variables in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

### Required Variables

```bash
DATABASE_URL="your-postgresql-connection-string"
DIRECT_URL="your-postgresql-connection-string"
```

If you don't have a database set up yet, you can use placeholder values temporarily:

```bash
DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
DIRECT_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
```

### Optional Variables

```bash
NEXT_PUBLIC_BASE_URL="https://your-vercel-domain.vercel.app"
POLYMARKET_API_URL="https://gamma-api.polymarket.com"
```

## Setting up a PostgreSQL Database

### Option 1: Vercel Postgres (Recommended)

1. In your Vercel project, go to the **Storage** tab
2. Click **Create Database** → **Postgres**
3. Follow the prompts to create your database
4. Vercel will automatically set the environment variables

### Option 2: External Provider (Neon, Supabase, etc.)

1. Create a PostgreSQL database with your preferred provider
2. Copy the connection string
3. Add it as `DATABASE_URL` and `DIRECT_URL` in Vercel

## Prisma Setup

After setting up the database, run migrations:

```bash
npx prisma migrate deploy
```

## Troubleshooting

If the build fails with "Missing required environment variable: DATABASE_URL":
- Make sure you've added the environment variables in Vercel
- Redeploy the project after adding environment variables
- Check that the variable names match exactly (case-sensitive)
