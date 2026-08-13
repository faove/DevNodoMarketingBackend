# DevNodo Marketing Backend

Laravel 13 API for email outreach and reply tracking (Mailcow + `devnodo_marketing`).

## Stack

- Laravel Framework 13 / PHP 8.4
- PostgreSQL `devnodo_marketing` on `127.0.0.1:5432`
- Redis (queues/cache in Docker)
- Mailcow (SMTP/IMAP) — pending

## Local (Docker)

```bash
cp .env.example .env   # if needed; set DB_PASSWORD
docker compose -f docker-compose-local.yml up -d --build
```

App: `http://localhost:8010` (host network; avoids Apache on :80)  
API stats: `GET http://localhost:8010/api/dashboard/stats`

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

CRM tables already exist (see `tributario/sql`). Scaffold migrations are in `database/migrations/_laravel_scaffold/`.

## Without Docker

Requires PHP 8.4+ with `pdo_pgsql` / `intl` / `redis` optional.
