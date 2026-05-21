# QuickBite Frontend

QuickBite is an Angular frontend for a multi-role food ordering experience.

## What's inside

- role-based sign-in and login flows
- customer browsing, cart, and order history
- owner, delivery, and admin dashboards
- profile, address, and favorites management
- Razorpay checkout flow wired through the API layer

## Local Development

```bash
npm install
npm start
```

The app runs with the local proxy in `proxy.conf.json`, which forwards API requests to `http://localhost:8080`.

## Build

```bash
npm run build
```

The production output is generated in `dist/frontend`.

## Deploying to Vercel

1. Push the project to GitHub, GitLab, or Bitbucket.
2. Import the repository in Vercel.
3. Use these settings:
   - Framework preset: `Angular`
   - Build command: `npm run build`
   - Output directory: `dist/frontend`
4. Deploy.

The included `vercel.json` keeps Angular client-side routes working on refresh and direct navigation.

## Important Production Note

Before deploying, update `src/environments/environment.ts` so `apiBaseUrl` points to your live backend, not `http://localhost:8080/api`.

## Asset Folders

Place images in:

- `public/assets/images/logo/`
- `public/assets/images/hero-banners/`
- `public/assets/images/categories/`
- `public/assets/images/food-items/`
