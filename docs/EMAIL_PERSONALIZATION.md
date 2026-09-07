# Email personalizado — referencia funcional

Documentación de cierre del feature (Fases 3-6 de `docs/EMAIL_PERSONALIZATION_ROADMAP.md`).
Cubre merge tags, reglas de resolución de destinatarios y el flujo preview → confirmar → enviar.

## Merge tags disponibles

Se interpolan con `{{namespace.campo}}` (case-insensitive) en `campanas.asunto` y
`campanas.plantilla_html`. Implementación: `App\Services\EmailTemplateRenderer::render()`
(backend, fuente de verdad) y `resources/js/lib/merge-tags.ts::renderTemplate()` (espejo en
cliente, usado solo para el preview en vivo del editor — no para lo que finalmente se persiste
o envía).

| Tag | Valor |
|---|---|
| `{{cliente.nombre_completo}}` | `nombre + apellido` → si están vacíos, `razon_social` → si también está vacío, `"Estimado/a"` |
| `{{cliente.nombre}}` | `clientes.nombre` |
| `{{cliente.apellido}}` | `clientes.apellido` |
| `{{cliente.razon_social}}` | `clientes.razon_social` |
| `{{cliente.email}}` | contacto elegido (si se pasó `contacto_id`) → `email_principal` |
| `{{cliente.ciudad}}` | `clientes.ciudad` |
| `{{cliente.provincia}}` | `clientes.provincia` |
| `{{empresa.nombre}}` | `config('empresa.nombre')` — `EMPRESA_NOMBRE` o `MAIL_FROM_NAME` |
| `{{empresa.email}}` | `config('empresa.email')` — `EMPRESA_EMAIL` o `MAIL_FROM_ADDRESS` |

Todo valor interpolado se escapa con `e()` (HTML-escape) antes de insertarse — el HTML de la
plantilla en sí no se escapa, solo los valores de los tags. Un tag desconocido o sin valor
interpola como string vacío (no rompe el render, no tira error).

## Reglas de resolución de destinatarios

`App\Services\CampaignRecipientResolver` decide, para cada cliente candidato, a qué dirección
enviarle (o por qué omitirlo). Un candidato se arma vía **una** de estas tres fuentes
(mutuamente excluyentes, en este orden de prioridad si se pasa más de una):

1. `cliente_id` — un único cliente puntual (preview de prueba, send-test).
2. `segmento_id` — interpreta `segmentos.reglas_json` (ver abajo).
3. `filtros` sueltos — `con_email`, `opt_in_email`, `provincia`, `estado`, `origen_tabla`.

Si no se pasa nada de lo anterior, el candidato es **toda la tabla `clientes`** (hoy ~96.500
filas) — no hay un filtro implícito de "solo con email" o "solo con opt-in". Esto es intencional
para que el preview muestre la foto completa (incluyendo por qué se omitiría cada uno), pero
implica que "Confirmar audiencia" sin acotar por segmento u otro filtro arma una fila en
`campana_destinatarios` por cada cliente de la base, la gran mayoría `omitido`.

### Reglas de `segmentos.reglas_json`

No es una DSL genérica, son claves ad-hoc que `applyReglasSegmento()` interpreta una por una:

| Clave | Efecto |
|---|---|
| `require: [campo, ...]` | `whereNotNull(campo) AND campo != ''` para cada campo listado |
| `estado_not: [valor, ...]` | `whereNotIn('estado', [...])` |
| `opt_in_email: bool` | `where('opt_in_email', bool)` |
| `opt_in_whatsapp: bool` | `where('opt_in_whatsapp', bool)` |
| `provincia: string` | `where('provincia', valor)` |
| `origen_tabla: string` | `where('origen_tabla', valor)` |

Segmentos configurados hoy: `email_activos` (require `email_principal`, `estado_not:
[no_contactar]`, `opt_in_email: true`), `whatsapp_activos`, `comercios_cordoba`.

### Prioridad de email por cliente (`resolveDestino()`)

1. **Contacto elegido** — si se pasó `contacto_id` y ese contacto es `tipo=email` con `valor`
   no vacío → se usa ese. Origen: `contacto_elegido`.
2. **Email principal** — `clientes.email_principal`, si no está vacío. Origen: `email_principal`.
3. **Contacto marcado principal** — el primer `cliente_contactos` con `tipo=email` y
   `es_principal=true`. Origen: `contacto_principal`.
4. Si ninguna aplica → `destino = null`, motivo `sin_email`.

El fallback #3 sólo puede activarse sobre contactos `tipo=email` porque el query base ya
precarga `contactos` filtrados por ese tipo (`baseQuery()`); nunca se cae a un contacto de
teléfono o WhatsApp por error.

Todo email resuelto se normaliza con `strtolower(trim($email))` antes de compararse o
guardarse — esto es lo que hace que el `UNIQUE (campana_id, cliente_id, canal, destino)` en
Postgres (índice case-sensitive, sin collation especial) funcione como dedupe case-insensitive
en la práctica: dos variantes de mayúsculas/minúsculas del mismo email nunca generan dos filas.

### Motivos de omisión (`motivoOmision()`)

Se evalúan en este orden; el primero que aplica gana:

| Motivo | Condición |
|---|---|
| `sin_email` | No se pudo resolver ningún destino (ver arriba) |
| `opt_out` | `clientes.opt_out_at IS NOT NULL` |
| `no_contactar` | `clientes.estado = 'no_contactar'` |
| `sin_opt_in` | `opt_in_email = false` (salvo `ignore_opt_in=true`) |

`ignore_opt_in` se usa en `email-preview` y `send-test` para poder previsualizar/probar un
cliente puntual aunque no tenga opt-in — nunca se usa en `build` de audiencia real ni debería
usarse para envío masivo.

Un destinatario con motivo no nulo se marca `omitido=true` en el preview; si tiene `destino`
resuelto igual se persiste en `build()` (fila con `estado=omitido`, para trazabilidad), salvo
que `destino` sea `null` (ahí no hay clave única que respetar, no se persiste nada).

### Duplicados

`duplicado=true` cuando el par `(cliente_id, destino)` normalizado ya existe en
`campana_destinatarios` para esa campaña (comparado contra lo ya persistido, no contra otras
filas del mismo preview). `build()` usa `upsert()` con conflict target
`(campana_id, cliente_id, canal, destino)`, así que reconfirmar audiencia es idempotente: no
duplica filas, sólo actualiza `estado` / `error_msg` / `meta_json`.

## Flujo preview → confirmar → enviar

1. **`/campanas/{id}` — sección Email.** Se edita `asunto` y `plantilla_html`, con panel de
   merge tags (insertan en el campo con foco) y preview en vivo contra un cliente de prueba
   elegido por búsqueda server-side (`GET /clientes/buscar`). El preview en vivo es 100% cliente
   (no pega al backend en cada tecla); el asunto/plantilla se guarda con `PUT /campanas/{id}`.
2. **`/campanas/{id}/preview` — audiencia.** Pagina `POST destinatarios/preview` (50 por página),
   muestra Cliente / Email destino / Origen / Asunto renderizado / Opt-in / Estado, con filtros
   Todos/Válidos/Omitidos/Duplicados (client-side, con conteo, sobre la página cargada) y preview
   por fila (ícono ojo → `GET email-preview`). Desde acá:
   - **Confirmar audiencia** → `POST destinatarios/build`, persiste vía upsert.
   - **Enviar prueba a mi email** → elige un cliente (mismo buscador), manda con `POST
     send-test` al email del usuario logueado (mailer `log` en dev, sin SMTP real).
   - **Enviar campaña** → deshabilitado a propósito (ver pendientes).
3. **`/clientes/{id}` — botón "Vista previa email".** Sólo visible si hay campañas `estado=
   borrador` + `canal=email`; abre un modal con el render server-side (`GET email-preview`) para
   ese cliente/contacto puntual, sin pasar por el flujo de campaña.

## Hallazgo de QA (Fase 6) — dato sucio en `email_principal`

Un cliente real en la base (`clientes.id = 1` en este entorno) tiene `email_principal = '0'`
(string cero, no vacío ni null) — probablemente un artefacto de la importación original del CRM.
`resolveDestino()` usa el helper `filled()` de Laravel, que trata `'0'` como **no vacío**
(sólo `null`, `''` y strings en blanco cuentan como vacíos), así que hoy ese cliente resuelve
`destino = '0'` y `origen = email_principal` — un "email" evidentemente inválido pasa las
validaciones de `motivoOmision()` (que sólo chequea `null`, no formato) y quedaría persistido
como destinatario válido si se confirma audiencia sin acotar por segmento/filtro que excluya
este caso.

**Impacto hoy:** 1 de 96.536 clientes. No se corrigió en esta fase — es un cambio de
comportamiento sobre lógica de Fase 3 ya cerrada y verificada, y requiere decidir el criterio
correcto (¿excluir por formato de email? ¿tratar `'0'`/valores no-email como `sin_email` en el
import? ¿limpiar el dato en origen?). Queda como pendiente explícito abajo.

## Resumen final de pendientes

- **SMTP/Mailcow real.** Hoy `MAIL_MAILER=log`; no hay conexión SMTP configurada. El CTA
  "Enviar campaña" está deshabilitado a propósito hasta que exista.
- **Opt-in masivo.** `opt_in_email=false` en el 100% de los 96.536 clientes — no hay criterio
  legal definido todavía para reclasificar esto ni para permitir un envío masivo real. Bloqueo
  intencional, no técnico.
- **Tracking de opens/clicks.** El esquema (`campana_destinatarios.abierto_at`, estados
  `abierto`/`click`) ya existe pero no hay integración real (pixel de tracking, webhooks de
  proveedor SMTP) — queda para cuando haya un proveedor de envío real conectado.
- **Selector de segmento/filtros en `/campanas/{id}/preview`.** Hoy "Confirmar audiencia" sin
  acotar opera sobre la base completa de clientes (ver "Reglas de resolución" arriba). Si se
  quiere que cada campaña apunte a un segmento específico, falta UI para elegirlo (y
  potencialmente persistir esa elección — `campanas` no tiene `segmento_id` hoy).
- **Dato sucio `email_principal='0'`.** Ver hallazgo de QA arriba.
- **Filtros de la tabla de preview son client-side.** Sólo reflejan la página cargada (50 filas),
  no hay conteo agregado real de omitidos/válidos/duplicados sobre el total de la audiencia sin
  paginar todo. Suficiente para QA manual campaña por campaña; no escala como reporte.
