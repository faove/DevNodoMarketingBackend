-- Registry of each daily/campaign send wave in devnodo_marketing
CREATE TABLE IF NOT EXISTS campaign_send_registros (
    id                 BIGSERIAL PRIMARY KEY,
    fecha              DATE NOT NULL,
    campana_id         INTEGER REFERENCES campanas(id) ON DELETE SET NULL,
    enviados           INTEGER NOT NULL DEFAULT 0,
    fallidos           INTEGER NOT NULL DEFAULT 0,
    omitidos           INTEGER NOT NULL DEFAULT 0,
    tope_diario        INTEGER NOT NULL DEFAULT 50,
    restantes_dia      INTEGER NOT NULL DEFAULT 0,
    notificado_a       VARCHAR(200),
    notificado_at      TIMESTAMPTZ,
    destinatarios_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_send_registros_fecha_campana
    ON campaign_send_registros (fecha, campana_id);

CREATE INDEX IF NOT EXISTS idx_campaign_send_registros_fecha
    ON campaign_send_registros (fecha DESC);
