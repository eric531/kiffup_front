# KiffUp — Frontend

SPA Vue 3 + TypeScript (Vite) : pages publiques, espace partenaire (`/partenaire`) et back-office (`/admin`).
L'API est dans `../event-stay`.

## Démarrage

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173 (l'API doit tourner sur http://localhost:8000)
```

En développement, Vite redirige `/api`, `/auth` et `/sanctum` vers l'API : même origine, donc les cookies de
session Sanctum fonctionnent sans configuration CORS.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types + build de production (`dist/`) |
| `npm run test:unit` | Tests Vitest |
| `npm run test:e2e` | Tests Playwright (`npx playwright install` la première fois) |
| `npm run lint` / `npm run format` | Oxlint + ESLint / Prettier |

## Organisation

- `src/lib/api.ts` : client HTTP (cookies, jeton XSRF, erreurs Problem Details → `ApiError`).
- `src/stores/auth.ts` : session, rôles, connexion avec double authentification.
- `src/router/index.ts` : trois zones chargées à la demande, avec des gardes par rôle. Le back-office exige
  la double authentification.
- `src/pages/{public,auth,account,partner,admin}` : pages par zone.
