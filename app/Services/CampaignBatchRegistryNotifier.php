<?php

namespace App\Services;

use App\Models\Campana;
use App\Models\CampanaDestinatario;
use App\Models\CampaignSendRegistro;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class CampaignBatchRegistryNotifier
{
    public function __construct(private CampaignSendLimiter $limiter) {}

    /**
     * Persists a send registry row in devnodo_marketing.campaign_send_registros
     * and emails the audit inbox.
     */
    public function notifyIfWaveCompleted(?Campana $campana = null, bool $force = false): bool
    {
        $waveSize = $this->limiter->dailyLimit();
        if ($waveSize <= 0) {
            return false;
        }

        $sentToday = $this->limiter->sentToday();
        $remaining = $this->limiter->remainingToday();
        $campanaFinalizada = $campana !== null && $campana->estado === 'finalizada';
        $limitReached = $remaining <= 0;
        $exactWave = $sentToday > 0 && $sentToday % $waveSize === 0;

        if (! $force && $sentToday <= 0) {
            return false;
        }

        if (! $force && ! $limitReached && ! $campanaFinalizada && ! $exactWave) {
            return false;
        }

        $tz = (string) config('campaigns.daily_auto_timezone', $this->limiter->timezone());
        $dayKey = Date::now($tz)->toDateString();

        if ($campana !== null) {
            $fechaCampana = optional($campana->iniciada_at ?? $campana->finalizada_at)
                ?->timezone($tz)
                ->toDateString();
            if ($fechaCampana) {
                $dayKey = $fechaCampana;
            }
        }

        $cacheKey = $campana !== null
            ? "campaigns.registry.db.{$dayKey}.campana.{$campana->id}"
            : "campaigns.registry.db.{$dayKey}.wave.{$sentToday}";

        if (! $force && ! Cache::add($cacheKey, true, now()->addDay())) {
            return false;
        }

        if ($force) {
            Cache::put($cacheKey, true, now()->addDay());
        }

        $rowsQuery = CampanaDestinatario::query()
            ->with(['cliente:id,nombre,apellido,razon_social', 'campana:id,codigo,nombre'])
            ->whereIn('estado', ['enviado', 'entregado', 'abierto', 'click', 'respondido', 'fallido', 'omitido']);

        if ($campana !== null) {
            $rowsQuery->where('campana_id', $campana->id);
        } else {
            $rowsQuery->whereNotNull('enviado_at')
                ->where('enviado_at', '>=', $this->limiter->todayStart());
        }

        $rows = $rowsQuery
            ->orderBy('enviado_at')
            ->get(['id', 'campana_id', 'cliente_id', 'destino', 'enviado_at', 'estado', 'error_msg', 'meta_json']);

        $enviados = $rows->whereIn('estado', ['enviado', 'entregado', 'abierto', 'click', 'respondido'])->count();
        $fallidos = $rows->where('estado', 'fallido')->count();
        $omitidos = $rows->where('estado', 'omitido')->count();

        if ($enviados + $fallidos + $omitidos <= 0 && ! $force) {
            return false;
        }

        $destinatarios = $rows->map(function (CampanaDestinatario $row) {
            $name = trim(($row->cliente?->nombre ?? '').' '.($row->cliente?->apellido ?? ''));
            if ($name === '') {
                $name = (string) ($row->cliente?->razon_social ?? '');
            }

            return [
                'destinatario_id' => $row->id,
                'cliente_id' => $row->cliente_id,
                'nombre' => $name,
                'destino' => $row->destino,
                'estado' => $row->estado,
                'enviado_at' => optional($row->enviado_at)?->toIso8601String(),
                'campana_codigo' => $row->campana?->codigo,
                'error_msg' => $row->error_msg,
            ];
        })->values()->all();

        $to = (string) config('campaigns.registry_email', '');

        // Clean wrong same-campana rows from other dates when correcting.
        if ($campana !== null) {
            CampaignSendRegistro::query()
                ->where('campana_id', $campana->id)
                ->whereDate('fecha', '!=', $dayKey)
                ->delete();
        }

        $registro = CampaignSendRegistro::query()->updateOrCreate(
            [
                'fecha' => $dayKey,
                'campana_id' => $campana?->id,
            ],
            [
                'enviados' => $enviados,
                'fallidos' => $fallidos,
                'omitidos' => $omitidos,
                'tope_diario' => $waveSize,
                'restantes_dia' => $remaining,
                'destinatarios_json' => $destinatarios,
                'meta_json' => [
                    'database' => (string) config('database.connections.pgsql.database'),
                    'host' => (string) config('database.connections.pgsql.host'),
                    'from' => (string) config('mail.from.address'),
                    'campana_codigo' => $campana?->codigo,
                    'campana_estado' => $campana?->estado,
                    'sent_today_global' => $sentToday,
                ],
            ],
        );

        if ($to === '') {
            Log::info('Campaign send registry saved in DB without email notify', [
                'registro_id' => $registro->id,
                'database' => config('database.connections.pgsql.database'),
                'campana_id' => $campana?->id,
            ]);

            return true;
        }

        $lines = collect($destinatarios)->map(function (array $row, int $index) {
            return sprintf(
                '%d. %s <%s> — %s — %s',
                $index + 1,
                $row['nombre'] !== '' ? $row['nombre'] : '—',
                $row['destino'],
                $row['campana_codigo'] ?? 'n/a',
                $row['enviado_at'] ?? '—',
            );
        })->implode("\n");

        $subject = sprintf(
            '[DevNodo Marketing] Registro DB #%d: %d correos (%s)',
            $registro->id,
            $enviados,
            $dayKey,
        );

        $body = implode("\n", [
            'Registro guardado en PostgreSQL:',
            '  DB: '.config('database.connections.pgsql.database'),
            '  host: '.config('database.connections.pgsql.host'),
            '  table: campaign_send_registros',
            '',
            'registro_id: '.$registro->id,
            'Fecha: '.$dayKey,
            'Enviados (campaña/ola): '.$enviados,
            'Fallidos: '.$fallidos,
            'Omitidos: '.$omitidos,
            'Enviados hoy (global): '.$sentToday,
            'Tope diario: '.$waveSize,
            'Restantes hoy: '.$remaining,
            'Campaña: '.($campana?->codigo ?? 'n/a').' ('.($campana?->estado ?? 'n/a').')',
            'From: '.(string) config('mail.from.address'),
            '',
            'Destinatarios:',
            $lines !== '' ? $lines : '(sin filas)',
            '',
            '— DevNodo Marketing CRM',
        ]);

        try {
            Mail::raw($body, function ($message) use ($to, $subject) {
                $message->to($to)->subject($subject);
            });

            if ((bool) config('campaigns.registry_send_html_copy', true) && $campana !== null) {
                $sample = $rows->first(fn (CampanaDestinatario $row) => in_array($row->estado, ['enviado', 'entregado', 'abierto', 'click', 'respondido'], true));
                if ($sample !== null) {
                    $meta = is_array($sample->meta_json) ? $sample->meta_json : [];
                    $htmlCopy = (string) ($meta['html'] ?? $campana->plantilla_html ?? '');
                    $asuntoCopy = (string) ($meta['asunto'] ?? $campana->asunto ?? $campana->nombre);
                    if ($htmlCopy !== '') {
                        Mail::html($htmlCopy, function ($message) use ($to, $asuntoCopy, $sample) {
                            $message->to($to)->subject('[COPIA] '.$asuntoCopy.' → '.$sample->destino);
                        });
                    }
                }
            }

            $registro->update([
                'notificado_a' => $to,
                'notificado_at' => now(),
            ]);

            Log::info('Campaign batch registry saved in DB and emailed', [
                'registro_id' => $registro->id,
                'to' => $to,
                'enviados' => $enviados,
                'campana_id' => $campana?->id,
            ]);

            return true;
        } catch (Throwable $e) {
            Log::warning('Campaign batch registry email failed (DB row kept)', [
                'registro_id' => $registro->id,
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return true;
        }
    }
}
