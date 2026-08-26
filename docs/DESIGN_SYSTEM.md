# DevNodo Marketing Design System

Visual identity is shared with the DevNodo ecosystem (ported from WashNodoBackend).

## Stack

- Laravel 13 + Inertia v3 + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first `@theme`)
- shadcn/ui New York + Radix + CVA + Lucide
- Font: Manrope (500–800)
- Dark mode: `.dark` class + `appearance` cookie/localStorage

## Tokens

Defined in `resources/css/app.css`:

- `primary` — teal/cyan
- `secondary` — violet
- `background` / `card` / `muted` / `border`
- `success` / `warning` / `error` (`destructive`) / `info`
- Sidebar tokens (`sidebar-*`)

## Components

Reusable UI lives in `resources/js/components/ui/` (Button, Card, Badge, Table, Dialog, Sheet, Sidebar, Skeleton, Sonner, etc.).

App-level:

- `StatusBadge` — CRM/campaign status colors
- `EmptyState` — empty screens with CTA
- `Pagination` — Laravel paginator links
- Shell: `AppSidebar`, `AppSidebarHeader`, auth split layout

## Screens

| Route | Page |
|---|---|
| `/login` | Auth split |
| `/dashboard` | Control center KPIs |
| `/clientes`, `/clientes/{id}` | CRM list + detail |
| `/campanas`, `/campanas/{id}` | Campaigns + recipients |
| `/interacciones` | Activity feed |
| `/segmentos`, `/tags`, `/productos` | Catalog / audiences |
| `/imports`, `/imports/{id}` | ETL batches |
| `/settings/profile`, `/settings/appearance` | Account |

## Local access

```bash
docker compose -f docker-compose-local.yml up -d
npm run build   # or npm run dev
```

App: http://localhost:8010  
Seed user: `admin@devnodo.com` / `password`

## Notes

- Client list always uses server-side pagination (96k+ rows).
- Email send / Mailcow is out of scope for this UI MVP.
- API `GET /api/dashboard/stats` remains available.
