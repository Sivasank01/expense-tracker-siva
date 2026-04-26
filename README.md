# Siva Expense Tracker

Private personal expense tracker with Supabase login, AED currency, monthly dashboard, category summaries, add/edit/delete transactions, and CSV export.

## Setup

1. Install Node.js.
2. Create a Supabase project.
3. In Supabase SQL Editor, run `supabase-schema.sql`.
4. Create `.env` in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Install and run:

```bash
npm install
npm run dev
```

6. Open the local URL, sign up, then use it.

## Deploy to phone access

Deploy to Vercel and add the same environment variables in Vercel.
Then open the Vercel URL on your phone and add it to home screen.
