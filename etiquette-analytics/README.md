# Etiquette Analytics

Simple web dashboard to view branch performance and profitability analytics.

## Quick Start

1. **Set up environment variables:**
   ```bash
   # Edit .env.local and add your Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ADMIN_PASSWORD=your-secure-password
   ```

2. **Set up Supabase tables:**
   - Run the SQL in `supabase-setup.sql` in your Supabase SQL Editor
   - This creates the required tables: `branches`, `customers`, `workers`, `orders`

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open:** http://localhost:3000

## Login

- Email: `admin@etiquette.sa` (change `NEXT_PUBLIC_ADMIN_EMAIL` in .env.local)
- Password: `change-this-password` (change `ADMIN_PASSWORD` in .env.local)

## Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Deploy

## Supabase Table Structure

```
orders
├── id (text, primary key)
├── branch (text: "A" or "B")
├── order_number (text)
├── price (real)
├── paid (real)
├── balance (real, computed)
├── status (text)
├── created_at (timestamp)
└── worker_id (text)

customers
├── id (text, primary key)
├── name (text)
├── phone (text)
└── branch (text)
```

See `supabase-setup.sql` for complete schema.
