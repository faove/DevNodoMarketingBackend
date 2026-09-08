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
| `{{cliente.sector}}` | `clientes.sector` |
| `{{cliente.rubro}}` | `clientes.rubro` |
| `{{contacto.valor}}` | email del contacto elegido (vacío si no hay) |
| `{{contacto.etiqueta}}` | etiqueta del contacto elegido |
| `{{campana.nombre}}` | `campanas.nombre` |
| `{{producto.nombre}}` | producto asociado a la campaña |
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

1. **Contacto elegido** — si se pasó `contacto_id` y ese contacto es `tipo=email` con email
   válido → se usa ese. Origen: `contacto_elegido`.
2. **Email principal** — `clientes.email_principal`, si pasa validación de formato. Origen:
   `email_principal`.
3. **Contacto marcado principal** — el primer `cliente_contactos` con `tipo=email` y
   `es_principal=true` y email válido. Origen: `contacto_principal`.
4. **Cualquier contacto email válido** — fallback. Origen: `contacto_email`.
5. Si ninguna aplica → `destino = null`, motivo `sin_email`.

Un email se considera válido solo si `filter_var(..., FILTER_VALIDATE_EMAIL)` pasa tras
`strtolower(trim(...))`. Valores vacíos, `"0"` (artefacto de import) y strings no-email se
rechazan como `sin_email` y no se persisten como destino.

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
2. **`/campanas/{id}/preview` — audiencia.** Selector de segmento o filtros (`con_email`,
   `opt_in_email`, `provincia`). Pagina `POST destinatarios/preview` (50 por página),
   muestra Cliente / Email destino / Origen / Asunto renderizado / Opt-in / Estado, con filtros
   Todos/Válidos/Omitidos/Duplicados (client-side, con conteo, sobre la página cargada) y preview
   por fila (ícono ojo → `GET email-preview`). Desde acá:
   - **Confirmar audiencia** → `POST destinatarios/build` con el mismo segmento/filtros aplicados.
   - **Enviar prueba a mi email** → elige un cliente (mismo buscador), manda con `POST
     send-test` al email del usuario logueado (mailer `log` en dev, sin SMTP real).
   - **Enviar campaña** → deshabilitado a propósito (ver pendientes).
3. **`/clientes/{id}` — botón "Vista previa email".** Sólo visible si hay campañas `estado=
   borrador` + `canal=email`; abre un modal con el render server-side (`GET email-preview`) para
   ese cliente/contacto puntual, sin pasar por el flujo de campaña.

## Hallazgo de QA (Fase 6) — dato sucio en `email_principal` (corregido)

Un cliente real (`clientes.id = 1`) tenía `email_principal = '0'`. Tras la validación de formato
en `CampaignRecipientResolver::esEmailValido()`, ese valor se rechaza y el cliente queda
`sin_email` (o cae a un contacto email válido si existe).

## Resumen final de pendientes

- **SMTP/Mailcow real.** Hoy `MAIL_MAILER=log`; no hay conexión SMTP configurada. El CTA
  "Enviar campaña" está deshabilitado a propósito hasta que exista.
- **Opt-in masivo.** `opt_in_email=false` en la gran mayoría de clientes — no hay criterio
  legal definido todavía para reclasificar esto ni para permitir un envío masivo real.
- **Tracking de opens/clicks.** El esquema ya existe pero no hay integración real.
- **Filtros de la tabla de preview son client-side.** Sólo reflejan la página cargada (50 filas);
  el selector de segmento/filtros sí acota server-side el total evaluado.
