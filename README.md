# Tridelta Cookbook

A shared recipe cookbook: submit recipes as text or screenshots (auto-cleaned by Claude),
then browse/search/sort them. Built with React + Vite, deployable free on Cloudflare Pages.

## What's here

- `src/` — the React app (frontend)
- `functions/api/recipes.js` — Cloudflare Pages Function, stores recipes in Workers KV
- `functions/api/extract.js` — Cloudflare Pages Function, proxies the "clean up recipe" AI call
  to the Anthropic API (keeps your API key server-side, never exposed to the browser)

## 1. Get an Anthropic API key

Sign up / log in at [console.anthropic.com](https://console.anthropic.com), create an API key.
You'll only need this for the "Clean up & auto-fill" AI feature — the site works fine without
it, that button will just show an error.

## 2. Deploy to Cloudflare Pages

**Option A — via GitHub (recommended)**

1. Push this folder to a new GitHub repo.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy. It'll fail to load recipes until you finish step 3 below — that's expected.

**Option B — direct upload (no GitHub)**

```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name=tridelta-cookbook
```

## 3. Add a KV namespace for recipe storage

1. Cloudflare dashboard → **Workers & Pages → KV → Create namespace**, name it e.g. `RECIPES_KV`.
2. Go to your Pages project → **Settings → Functions → KV namespace bindings → Add binding**:
   - Variable name: `RECIPES_KV`
   - KV namespace: the one you just created
3. Redeploy (or it applies to the next deploy automatically).

## 4. Add your Anthropic API key as a secret

Pages project → **Settings → Environment variables → Add variable**:
- Name: `ANTHROPIC_API_KEY`
- Value: your key from step 1
- Mark it **Encrypt** / add it to both Production and Preview environments

Redeploy after adding it.

## 5. (Optional) local development

```bash
npm install
npm run dev          # frontend only, http://localhost:5173 — /api calls will 404
```

To test the API functions locally too, use Wrangler instead:

```bash
npm run build
npx wrangler pages dev dist --kv RECIPES_KV
```

## Costs

- Cloudflare Pages hosting: free
- Workers KV: free tier covers this comfortably (100k reads/day, 1k writes/day)
- Anthropic API: pay-per-use, only when someone clicks "Clean up & auto-fill" — a typical
  recipe extraction costs a fraction of a cent

## Notes / limits

- Recipes (including images, stored as base64) are kept in a single KV key, capped at 25MB total —
  plenty for hundreds of recipes with modest photos, but if the cookbook grows very large,
  migrate to Cloudflare D1 or R2 for images.
- There's no authentication — anyone with the link can submit. Add Cloudflare Access or a
  simple shared password if you want to restrict it.
