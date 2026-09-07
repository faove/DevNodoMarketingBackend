# Roadmap — Email personalizado + vistas de confirmación

Plan de ejecución fase por fase. Marcar `[x]` a medida que se completa cada paso.
Fases 1-2 (auditoría + propuesta funcional) ya cerradas — ver resumen abajo. Este documento
arranca la ejecución en Fase 3.

## Resumen de decisiones (Fases 1-2, ya validadas)

- Stack confirmado: Laravel 13 + Inertia v3 + React 19/TS, sin Blade SPA vieja.
- `opt_in_email = false` en el 100% de los 96.536 clientes hoy → preview/test debe poder
  ignorar el flag explícitamente; envío masivo real queda bloqueado hasta criterio legal.
- `campanas` y `campana_destinatarios` están vacías — no hay datos de prueba en BD todavía.
- `segmentos.reglas_json` es un objeto de reglas ad-hoc (`require`, `estado_not`,
  `opt_in_email`/`opt_in_whatsapp`, `provincia`, `origen_tabla`), no una DSL genérica.
- No hay librería de combobox/typeahead (`cmdk`/Popover) en el proyecto → selector de
  cliente de prueba se resuelve con `Dialog` + búsqueda server-side + `Table` existentes.
- `MAIL_MAILER=log` habilita "enviar prueba" sin SMTP real.
- Merge tags, reglas de resolución de destinatarios y flujo UX: ver propuesta acordada en
  el chat (se vuelca a `docs/EMAIL_PERSONALIZATION.md` al cerrar Fase 6).

---

## Fase 3 — Backend mínimo ✅ (cerrada 2026-08-29)

- [x] `App\Services\EmailTemplateRenderer`
  - [x] Parseo de `{{ns.campo}}` en asunto y `plantilla_html`
  - [x] Fallbacks: `cliente.nombre_completo` → nombre+apellido → razon_social → "Estimado/a"
  - [x] Escapado HTML de todo valor interpolado (excepto los que ya vienen como HTML de plantilla)
  - [x] Constantes `empresa.nombre` / `empresa.email` (config, no BD) — `config/empresa.php`
  - [x] Método que devuelve snapshot renderizado (para `meta_json`) — `renderSnapshot()`
- [x] `App\Services\CampaignRecipientResolver`
  - [x] Resolver por cliente individual
  - [x] Resolver por `segmento_id` interpretando claves de `reglas_json`
  - [x] Resolver por filtros sueltos (opt-in, con email, provincia, estado, origen_tabla)
  - [x] Reglas de email: contacto elegido → `email_principal` → `cliente_contactos.es_principal=true`
  - [x] Normalizar lowercase + dedupe por `(campana_id, cliente_id, canal, destino)` (flag `duplicado` en preview + `upsert` idempotente en build)
  - [x] Marcar `omitido` con motivo: `sin_email` / `opt_out` / `no_contactar` / `sin_opt_in` (este último ignorable con `ignore_opt_in` para preview de un cliente puntual / send-test)
  - [x] Upsert en `campana_destinatarios` sin romper el UNIQUE constraint existente
- [x] Rutas (agregadas a `routes/web.php`, sin tocar las existentes):
  - [x] `POST /campanas/{campana}/destinatarios/preview` — paginado, incluye asunto renderizado, motivo, duplicado
  - [x] `GET /campanas/{campana}/email-preview?cliente_id=&contacto_id=` — ignora opt-in (es solo proof)
  - [x] `POST /campanas/{campana}/destinatarios/build` — persiste vía upsert, devuelve resumen `{total, persistidos, omitidos}`
  - [x] `POST /campanas/{campana}/send-test` — envío único a `to` explícito (mailer `log` por defecto vía `MAIL_MAILER`)
- [x] Validaciones: `build` y `send-test` solo si `campana.estado` en `borrador|programada` (`ValidationException`)
- [x] Bloqueo de envío masivo real: no existe ruta de envío masivo en esta fase — solo `send-test` (1 destinatario explícito) y `build` (arma audiencia, no envía). El CTA "Enviar campaña" queda para Fase 4, deshabilitado sin SMTP.

Verificado manualmente contra la BD real (96.536 clientes) vía tinker: resolver por segmento, por filtros sueltos, por cliente individual, escapado XSS, upsert idempotente, detección de duplicados y envío de prueba con mailer `log` (contenido verificado en `storage/logs/laravel.log`). Datos de prueba creados durante la verificación fueron eliminados al terminar. Tests existentes (`php artisan test`) siguen en verde salvo el `ExampleTest` que ya fallaba antes (`/` redirige a `/dashboard`, no relacionado).

**Nota de datos:** el segmento `email_activos` matchea 0 clientes hoy porque `opt_in_email=false` en el 100% de la base (ver resumen Fases 1-2). Es el comportamiento esperado, no un bug.

## Fase 4 — Vistas React

- [ ] `/campanas/{id}` — sección "Email" (reemplaza el alert actual en `campanas/show.tsx`)
  - [ ] Editor asunto + `plantilla_html`
  - [ ] Panel de merge tags clicables (insertar en cursor)
  - [ ] Selector de cliente de prueba (Dialog + búsqueda server-side)
  - [ ] Selector opcional de `cliente_contactos` tipo email
  - [ ] Preview en vivo (iframe) con toggle Desktop/Mobile
  - [ ] Cabecera simulada From/To/Subject
- [ ] `/campanas/{id}/preview` (página o modal fullscreen)
  - [ ] Tabla: Cliente | Email destino | Origen | Asunto renderizado | Preview | Opt-in | Estado
  - [ ] Filtros: omitidos / válidos / duplicados
  - [ ] Acción "Confirmar audiencia"
  - [ ] Acción "Enviar prueba a mi email"
  - [ ] CTA "Enviar campaña" (disabled + explicación mientras no haya SMTP)
- [ ] `/clientes/{id}` — botón "Vista previa email"
  - [ ] Visible solo si hay campaña en borrador disponible
  - [ ] Modal con render para ese cliente/contacto
- [ ] Estados UI: loading, empty, error, success (sonner) en las tres pantallas

## Fase 5 — Reglas de resolución (verificación cruzada con Fase 3)

- [ ] Confirmar prioridad de email implementada tal cual está documentada arriba
- [ ] Confirmar normalización lowercase + dedupe respeta el UNIQUE de BD
- [ ] Confirmar los 4 motivos de omisión están cubiertos y visibles en la UI de preview

## Fase 6 — QA + documentación

- [ ] `npm run build`
- [ ] `docker exec -w /var/www/html devnodo-marketing-backend php artisan test`
- [ ] Caso: preview con cliente que solo tiene `razon_social`
- [ ] Caso: preview con `nombre` + `apellido`
- [ ] Caso: preview usando email de `cliente_contactos`
- [ ] Caso: poblado de destinatarios desde segmento `email_activos`
- [ ] Caso: UI muestra conteo correcto de omitidos vs válidos
- [ ] Redactar `docs/EMAIL_PERSONALIZATION.md` (merge tags, reglas de resolución, flujo preview → confirmar → enviar)
- [ ] Resumen final de pendientes: SMTP/Mailcow, opt-in masivo, tracking de opens

## Restricciones activas durante toda la ejecución

- No romper `/login`, `/dashboard`, `GET /api/dashboard/stats`
- No inventar módulos de redes sociales o IA
- No enviar emails masivos reales sin SMTP configurado
- Mantener paginación server-side (96k clientes)
- UI en español, código/comentarios en inglés
- Reutilizar `Card`, `Table`, `StatusBadge`, `EmptyState`, `Dialog`, `Button`
- No modificar el esquema CRM salvo que sea imprescindible
