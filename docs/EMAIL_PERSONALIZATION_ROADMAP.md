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

## Fase 4 — Vistas React ✅ (cerrada 2026-09-07)

- [x] `/campanas/{id}` — sección "Email" (reemplaza el alert actual en `campanas/show.tsx`)
  - [x] Editor asunto + `plantilla_html` — `CampaignEmailEditor`, visible solo si `canal === 'email'`, guarda vía `router.put` reenviando el resto de los campos de la campaña como hidden fields
  - [x] Panel de merge tags clicables (insertar en cursor) — `MergeTagPanel` + `lib/insert-at-cursor.ts`, inserta en el campo con foco (`asunto` o `plantilla_html`)
  - [x] Selector de cliente de prueba (Dialog + búsqueda server-side) — `ClienteTestSelector`, contra `GET /clientes/buscar?q=` (nuevo endpoint JSON, limit 20)
  - [x] Selector opcional de `cliente_contactos` tipo email — Select condicional cuando el cliente elegido tiene contactos tipo email
  - [x] Preview en vivo (iframe) con toggle Desktop/Mobile — `EmailLivePreview`; el render es 100% cliente (`lib/merge-tags.ts::renderTemplate`, espejo de `EmailTemplateRenderer::render`), sin roundtrip al guardar
  - [x] Cabecera simulada From/To/Subject
- [x] `/campanas/{id}/preview` (página completa, no modal) — nueva ruta `GET /campanas/{campana}/preview`
  - [x] Tabla: Cliente | Email destino | Origen | Asunto renderizado | Preview (ícono ojo → dialog con iframe) | Opt-in | Estado
  - [x] Filtros: omitidos / válidos / duplicados — **se aplican client-side sobre la página cargada** (50 filas), no hay agregación server-side por estado; se avisa en la UI
  - [x] Acción "Confirmar audiencia" (`POST destinatarios/build`, sin filtros → aplica a los 96k clientes, matcheable a futuro con `segmento_id`/`filtros` si se agrega selector)
  - [x] Acción "Enviar prueba a mi email" — reutiliza `ClienteTestSelector` para elegir de qué cliente tomar los datos de personalización; el email destino se precarga desde `auth.user.email`
  - [x] CTA "Enviar campaña" (disabled + explicación)
- [x] `/clientes/{id}` — botón "Vista previa email" (`ClienteEmailPreviewDialog`)
  - [x] Visible solo si `campanasEmailBorrador` (prop nueva en `ClienteController::show`, campañas `estado=borrador` + `canal=email`) no está vacío
  - [x] Modal con render server-side para ese cliente/contacto vía `GET email-preview`
- [x] Estados UI: loading, empty, error (toast vía sonner) en las tres pantallas

**Nota de alcance (actualizada):** se agregó selector de segmento/filtros en
`/campanas/{id}/preview` (Fase 4.1). "Confirmar audiencia" ahora envía `segmento_id` o
`filtros` al backend. Validación de formato de email rechaza artefactos como `'0'`.

**Verificación:** `npm run types:check` y `npm run build` sin errores. `php artisan test` en verde salvo el `ExampleTest` pre-existente (no relacionado). Extensión de Chrome no disponible en este entorno para probar la UI en navegador — se verificaron todos los endpoints nuevos/tocados (`clientes/buscar`, `campanas/{id}/preview`, `email-preview`, `destinatarios/preview`, `destinatarios/build`, `send-test`, `PUT campanas/{id}`) con curl autenticado contra la app corriendo en Docker, usando una campaña y destinatario de prueba creados y eliminados al terminar.

## Fase 5 — Reglas de resolución (verificación cruzada con Fase 3) ✅ (cerrada 2026-09-07)

- [x] Confirmar prioridad de email implementada tal cual está documentada arriba — `CampaignRecipientResolver::resolveDestino()` (línea 252): `contacto_id` explícito (solo si `tipo=email` y `filled`) → `cliente.email_principal` → `cliente_contactos` con `es_principal=true`. El fallback a `contacto_principal` está implícitamente acotado a `tipo=email` porque `baseQuery()` sólo eager-carga `contactos` con `where('tipo','email')` — confirmado leyendo el query, no solo el método.
- [x] Confirmar normalización lowercase + dedupe respeta el UNIQUE de BD — constraint real en Postgres: `UNIQUE (campana_id, cliente_id, canal, destino)` (btree simple, sin collation case-insensitive), y `upsert()` usa exactamente esas 4 columnas como conflict target. Verificado empíricamente vía tinker sobre un cliente real (id 2, con rollback manual al terminar): build inicial con `email_principal` en minúsculas → 1 fila; se mutó temporalmente su contacto principal a MAYÚSCULAS y se corrió `preview()` con ese `contacto_id` → `destino` normalizado sigue en minúsculas y `duplicado=true`; un segundo `build()` con ese contacto en mayúsculas no violó el UNIQUE ni creó una segunda fila (sigue habiendo 1). Contacto y campaña de prueba revertidos/eliminados al terminar.
- [x] Confirmar los 4 motivos de omisión están cubiertos y visibles en la UI de preview — los 4 branches de `motivoOmision()` (`sin_email`, `opt_out`, `no_contactar`, `sin_opt_in`) se ejercitaron por reflection sin persistir cambios, confirmando que cada condición devuelve la clave esperada. En datos reales hoy sólo `sin_email` (41.608 clientes) y `sin_opt_in` (96.536, 100%) ocurren de forma natural — `opt_out_at` y `estado=no_contactar` no tienen casos actualmente (0 clientes), pero la lógica está probada y lista para cuando existan. La UI (`campanas/preview.tsx`) mapea las 4 claves a etiquetas en español (`MOTIVOS` — Sin email / Opt-out / No contactar / Sin opt-in) y las muestra debajo del badge "Omitido" en cada fila.

**Verificación:** todo se hizo vía `php artisan tinker` contra la BD real (sin fixtures), con datos de prueba creados y revertidos/eliminados al terminar cada bloque. `php artisan test` sigue en verde salvo el `ExampleTest` pre-existente (no relacionado). No hubo cambios de código en esta fase — es puramente de verificación cruzada.

## Fase 6 — QA + documentación ✅ (cerrada 2026-09-07)

- [x] `npm run build` — sin errores
- [x] `docker exec -w /var/www/html devnodo-marketing-backend php artisan test` — verde salvo el `ExampleTest` pre-existente (no relacionado)
- [x] Caso: preview con cliente que solo tiene `razon_social` — cliente real id 39408 ("Comercio C0158001"), `renderSnapshot()` devuelve `nombre_completo` = razón social, confirmado vía tinker
- [x] Caso: preview con `nombre` + `apellido` — cliente real id 2, fallback nombre+apellido confirmado
- [x] Caso: preview usando email de `cliente_contactos` — **no hay ningún cliente real hoy con `email_principal` vacío y un contacto `es_principal=true`** (0 de 96.536; el único candidato tiene `email_principal='0'`, ver hallazgo abajo). Probado por reflection con mutación en memoria (sin persistir) sobre un cliente real: al vaciar `email_principal` cae correctamente a `contacto_principal`.
- [x] Caso: poblado de destinatarios desde segmento `email_activos` (id 1, `codigo=email_activos`) — matchea 0 clientes hoy (100% `opt_in_email=false`, comportamiento esperado ya documentado en Fase 3). Probado dentro de una transacción con rollback: al flipear `opt_in_email=true` en un cliente candidato, el segmento lo matchea (1 resultado, es el cliente correcto); rollback confirmado (`opt_in_email=true` count vuelve a 0).
- [x] Caso: UI muestra conteo correcto de omitidos vs válidos — `campanas/preview.tsx` no mostraba conteos, solo filtraba filas; se agregó `counts` (Todos/Válidos/Omitidos/Duplicados) calculado sobre `result.data` y mostrado en las etiquetas del `ToggleGroup`. Por construcción `válidos + omitidos = todos` (partición exclusiva sobre `row.omitido`).
- [x] Redactar `docs/EMAIL_PERSONALIZATION.md` (merge tags, reglas de resolución, flujo preview → confirmar → enviar) — creado
- [x] Resumen final de pendientes: SMTP/Mailcow, opt-in masivo, tracking de opens — en `docs/EMAIL_PERSONALIZATION.md`, sección "Resumen final de pendientes"

**Hallazgo de QA (no corregido en esta fase):** `clientes.id=1` tiene `email_principal='0'`
(string, artefacto de import). `filled('0')` de Laravel lo trata como no-vacío, así que
`resolveDestino()` lo toma como email válido (`destino='0'`) en vez de caer a `sin_email` o al
contacto principal. Afecta 1 de 96.536 clientes hoy. No lo corregí porque modifica lógica de
Fase 3 ya cerrada/verificada y requiere decidir el criterio (¿validar formato de email en
`motivoOmision`? ¿limpiar el dato de origen?) — detalle completo en
`docs/EMAIL_PERSONALIZATION.md`.

**Verificación:** todos los casos de datos se probaron contra la BD real vía `php artisan
tinker`, usando reflection y transacciones con rollback donde hacía falta forzar un estado que
no existe hoy en los datos — sin persistir ni dejar residuos. Cambio de código de esta fase:
solo `resources/js/pages/campanas/preview.tsx` (conteos en el filtro).

## Restricciones activas durante toda la ejecución

- No romper `/login`, `/dashboard`, `GET /api/dashboard/stats`
- No inventar módulos de redes sociales o IA
- No enviar emails masivos reales sin SMTP configurado
- Mantener paginación server-side (96k clientes)
- UI en español, código/comentarios en inglés
- Reutilizar `Card`, `Table`, `StatusBadge`, `EmptyState`, `Dialog`, `Button`
- No modificar el esquema CRM salvo que sea imprescindible
