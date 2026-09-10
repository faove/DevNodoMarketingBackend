-- DevNodo Marketing schema for https://devnodo.com/
-- Target DB: devnodo_marketing

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Core: clients / leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL DEFAULT gen_random_uuid(),
    tipo            VARCHAR(20) NOT NULL DEFAULT 'lead'
                    CHECK (tipo IN ('lead', 'prospect', 'cliente', 'partner')),
    razon_social    VARCHAR(200),
    nombre          VARCHAR(120),
    apellido        VARCHAR(120),
    nombre_fantasia VARCHAR(200),
    documento_tipo  VARCHAR(20),
    documento_nro   VARCHAR(30),
    cuit_cuil       VARCHAR(13),
    email_principal VARCHAR(200),
    telefono_principal VARCHAR(40),
    whatsapp        VARCHAR(40),
    sitio_web       VARCHAR(255),
    sector          VARCHAR(80),
    rubro           VARCHAR(120),
    empresa_tamano  VARCHAR(30)
                    CHECK (empresa_tamano IS NULL OR empresa_tamano IN (
                        'solo', 'micro', 'pyme', 'mediana', 'grande'
                    )),
    ciudad          VARCHAR(120),
    provincia       VARCHAR(80) DEFAULT 'Córdoba',
    pais            VARCHAR(80) DEFAULT 'Argentina',
    codigo_postal    VARCHAR(20),
    direccion       TEXT,
    latitud         NUMERIC(10, 7),
    longitud        NUMERIC(10, 7),
    fuente          VARCHAR(80),
    fuente_detalle  VARCHAR(200),
    origen_tabla    VARCHAR(80),
    origen_id       VARCHAR(80),
    score           INTEGER NOT NULL DEFAULT 0,
    estado          VARCHAR(30) NOT NULL DEFAULT 'nuevo'
                    CHECK (estado IN (
                        'nuevo', 'contactado', 'calificado', 'propuesta',
                        'negociacion', 'ganado', 'perdido', 'no_contactar'
                    )),
    opt_in_email    BOOLEAN NOT NULL DEFAULT false,
    opt_in_sms      BOOLEAN NOT NULL DEFAULT false,
    opt_in_whatsapp BOOLEAN NOT NULL DEFAULT false,
    opt_in_llamada  BOOLEAN NOT NULL DEFAULT false,
    opt_out_at      TIMESTAMPTZ,
    notas           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_uuid ON clientes (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_email_principal
    ON clientes (lower(email_principal))
    WHERE email_principal IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes (telefono_principal);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes (whatsapp);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes (estado);
CREATE INDEX IF NOT EXISTS idx_clientes_sector ON clientes (sector);
CREATE INDEX IF NOT EXISTS idx_clientes_fuente ON clientes (fuente);
CREATE INDEX IF NOT EXISTS idx_clientes_cuit ON clientes (cuit_cuil);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
    ON clientes USING gin ((coalesce(razon_social, '') || ' ' || coalesce(nombre, '') || ' ' || coalesce(apellido, '')) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Extra contact channels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente_contactos (
    id           BIGSERIAL PRIMARY KEY,
    cliente_id   BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo         VARCHAR(20) NOT NULL
                 CHECK (tipo IN ('email', 'telefono', 'whatsapp', 'linkedin', 'otro')),
    valor        VARCHAR(255) NOT NULL,
    etiqueta     VARCHAR(60),
    es_principal BOOLEAN NOT NULL DEFAULT false,
    verificado   BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_contactos_valor
    ON cliente_contactos (cliente_id, tipo, lower(valor));
CREATE INDEX IF NOT EXISTS idx_cliente_contactos_valor ON cliente_contactos (lower(valor));

-- ---------------------------------------------------------------------------
-- Tags / segments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(60) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    color       VARCHAR(20),
    descripcion TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cliente_tags (
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (cliente_id, tag_id)
);

CREATE TABLE IF NOT EXISTS segmentos (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(60) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    descripcion TEXT,
    reglas_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Products / services of interest (DevNodo catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(40) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    categoria   VARCHAR(60) NOT NULL,
    descripcion TEXT,
    url         VARCHAR(255),
    activo      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS cliente_intereses (
    id          BIGSERIAL PRIMARY KEY,
    cliente_id  BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    prioridad   SMALLINT NOT NULL DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
    notas       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (cliente_id, producto_id)
);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campanas (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(60) NOT NULL UNIQUE,
    nombre          VARCHAR(160) NOT NULL,
    canal           VARCHAR(30) NOT NULL
                    CHECK (canal IN ('email', 'sms', 'whatsapp', 'llamada', 'ads', 'mixto')),
    objetivo        VARCHAR(200),
    producto_id     INTEGER REFERENCES productos(id),
    estado          VARCHAR(30) NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador', 'programada', 'activa', 'pausada', 'finalizada')),
    asunto          VARCHAR(255),
    mensaje_preview TEXT,
    plantilla_html  TEXT,
    programada_at   TIMESTAMPTZ,
    iniciada_at     TIMESTAMPTZ,
    finalizada_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campana_destinatarios (
    id           BIGSERIAL PRIMARY KEY,
    campana_id   INTEGER NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
    cliente_id   BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    canal        VARCHAR(30) NOT NULL,
    destino      VARCHAR(255) NOT NULL,
    estado       VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN (
                     'pendiente', 'enviado', 'entregado', 'abierto', 'click',
                     'respondido', 'rebote', 'fallido', 'omitido'
                 )),
    enviado_at   TIMESTAMPTZ,
    abierto_at   TIMESTAMPTZ,
    click_at     TIMESTAMPTZ,
    error_msg    TEXT,
    meta_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (campana_id, cliente_id, canal, destino)
);

CREATE INDEX IF NOT EXISTS idx_campana_dest_estado
    ON campana_destinatarios (campana_id, estado);

-- ---------------------------------------------------------------------------
-- Interactions / CRM activities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interacciones (
    id          BIGSERIAL PRIMARY KEY,
    cliente_id  BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    campana_id  INTEGER REFERENCES campanas(id) ON DELETE SET NULL,
    canal       VARCHAR(30) NOT NULL,
    direccion   VARCHAR(10) NOT NULL DEFAULT 'outbound'
                CHECK (direccion IN ('outbound', 'inbound')),
    tipo        VARCHAR(40) NOT NULL,
    asunto      VARCHAR(255),
    detalle     TEXT,
    resultado   VARCHAR(60),
    ocurrio_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  VARCHAR(80),
    meta_json   JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_interacciones_cliente_fecha
    ON interacciones (cliente_id, ocurrio_at DESC);

-- ---------------------------------------------------------------------------
-- Consent / compliance (Argentina Ley 25.326)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consentimientos (
    id           BIGSERIAL PRIMARY KEY,
    cliente_id   BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    canal        VARCHAR(30) NOT NULL,
    otorgado     BOOLEAN NOT NULL,
    base_legal   VARCHAR(80),
    evidencia    TEXT,
    ip_origen    INET,
    registrado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente
    ON consentimientos (cliente_id, canal, registrado_at DESC);

-- ---------------------------------------------------------------------------
-- Import batches from SAM / other sources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
    id            SERIAL PRIMARY KEY,
    fuente        VARCHAR(80) NOT NULL,
    archivo       VARCHAR(255),
    total_filas   INTEGER NOT NULL DEFAULT 0,
    insertadas    INTEGER NOT NULL DEFAULT 0,
    actualizadas  INTEGER NOT NULL DEFAULT 0,
    omitidas      INTEGER NOT NULL DEFAULT 0,
    errores       INTEGER NOT NULL DEFAULT 0,
    notas         TEXT,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS import_batch_rows (
    id         BIGSERIAL PRIMARY KEY,
    batch_id   INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    cliente_id BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
    origen_tabla VARCHAR(80),
    origen_id    VARCHAR(80),
    payload_json JSONB,
    estado     VARCHAR(20) NOT NULL DEFAULT 'ok'
               CHECK (estado IN ('ok', 'omitido', 'error')),
    mensaje    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_segmentos_updated_at ON segmentos;
CREATE TRIGGER trg_segmentos_updated_at
    BEFORE UPDATE ON segmentos
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_campanas_updated_at ON campanas;
CREATE TRIGGER trg_campanas_updated_at
    BEFORE UPDATE ON campanas
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed catalog
-- ---------------------------------------------------------------------------
INSERT INTO productos (codigo, nombre, categoria, descripcion, url) VALUES
    ('software_medida', 'Software a medida', 'desarrollo', 'Apps web/móviles para procesos propios', 'https://devnodo.com/'),
    ('odoo', 'Odoo Community', 'erp', 'Instalación, módulos, integraciones y soporte', 'https://devnodo.com/'),
    ('saas', 'Plataformas SaaS', 'saas', 'CRM, ERP, inventario, logística vertical', 'https://devnodo.com/'),
    ('ia', 'Inteligencia Artificial', 'ia', 'Agentes, chatbots y automatización documental', 'https://devnodo.com/'),
    ('vision', 'Visión artificial', 'ia', 'Patentes, OCR, cámaras IP y acceso', 'https://devnodo.com/'),
    ('devops', 'Infraestructura y DevOps', 'infra', 'Linux, Docker, Traefik, PostgreSQL, backups', 'https://devnodo.com/'),
    ('wash', 'Wash', 'producto', 'SaaS para autolavados', 'https://devnodo.com/'),
    ('learn', 'Learn', 'producto', 'Plataforma de cursos técnicos', 'https://devnodo.com/')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tags (codigo, nombre, color, descripcion) VALUES
    ('pyme_cordoba', 'PYME Córdoba', '#2563eb', 'Empresas/personas en Córdoba'),
    ('comercio', 'Comercio', '#16a34a', 'Comercios habilitados'),
    ('contribuyente', 'Contribuyente', '#ca8a04', 'Alta de contribuyentes'),
    ('tiene_email', 'Tiene email', '#0ea5e9', 'Contacto con correo válido'),
    ('tiene_tel', 'Tiene teléfono', '#8b5cf6', 'Contacto con teléfono'),
    ('autolavado', 'Autolavado', '#f97316', 'Sector Wash / lavaderos'),
    ('taller', 'Taller', '#64748b', 'Talleres mecánicos'),
    ('clinica', 'Clínica', '#ec4899', 'Clínicas / salud'),
    ('retail', 'Retail', '#14b8a6', 'Comercio minorista')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO segmentos (codigo, nombre, descripcion, reglas_json) VALUES
    ('email_activos', 'Con email y opt-in', 'Contactos con email y consentimiento email',
     '{"require":["email_principal"],"opt_in_email":true,"estado_not":["no_contactar"]}'::jsonb),
    ('whatsapp_activos', 'WhatsApp opt-in', 'Contactos con WhatsApp habilitado',
     '{"require":["whatsapp"],"opt_in_whatsapp":true}'::jsonb),
    ('comercios_cordoba', 'Comercios Córdoba', 'Importados desde comer SAM',
     '{"origen_tabla":"comer","provincia":"Córdoba"}'::jsonb)
ON CONFLICT (codigo) DO NOTHING;
