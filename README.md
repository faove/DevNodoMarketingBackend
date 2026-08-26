# DevNodo Marketing Backend

Laravel 13 + Inertia/React SaaS for email outreach CRM (`devnodo_marketing`).

## Stack

- Laravel Framework 13 / PHP 8.4
- Inertia v3 + React 19 + TypeScript + Tailwind 4
- PostgreSQL `devnodo_marketing`
- Redis (queues/cache in Docker)
- Mailcow (SMTP/IMAP) — pending for send pipeline

## Local (Docker)

```bash
cp .env.example .env   # if needed
docker compose -f docker-compose-local.yml up -d --build
npm install
npm run build
docker exec -w /var/www/html devnodo-marketing-backend php artisan migrate --force
docker exec -w /var/www/html devnodo-marketing-backend php artisan db:seed --force
```

App: http://localhost:8010  
Login: `admin@devnodo.com` / `password`  
API stats: `GET /api/dashboard/stats`

Design system notes: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)

## UI routes

- `/dashboard` — marketing control center
- `/clientes` — CRM (paginated)
- `/campanas` — campaigns + recipients
- `/interacciones`, `/segmentos`, `/tags`, `/productos`, `/imports`
- `/settings/profile`, `/settings/appearance`

## Eloquent models

| Model | Table |
|---|---|
| `Cliente` | `clientes` |
| `ClienteContacto` | `cliente_contactos` |
| `Tag` | `tags` |
| `Segmento` | `segmentos` |
| `Producto` | `productos` |
| `ClienteInteres` | `cliente_intereses` |
| `Campana` | `campanas` |
| `CampanaDestinatario` | `campana_destinatarios` |
| `Interaccion` | `interacciones` |
| `Consentimiento` | `consentimientos` |
| `ImportBatch` | `import_batches` |
| `ImportBatchRow` | `import_batch_rows` |

CRM tables already exist (see `tributario/sql`). Scaffold migrations for Laravel auth/cache/jobs are in `database/migrations/`.
