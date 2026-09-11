<?php

namespace App\Services;

use App\Models\Campana;
use App\Models\CampanaDestinatario;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class CampaignBatchRegistryNotifier
{
    public function __construct(private CampaignSendLimiter $limiter) {}

    /**
     * Sends a registry email to CAMPAIGN_REGISTRY_EMAIL when a daily wave completes:
     * - daily send limit reached, or
     * - the active campaign finishes after sending today.
     */
    public function notifyIfWaveCompleted(?Campana $campana = null, bool $force = false): bool
    {
        $to = (string) config('campaigns.registry_email', '');
        $waveSize = $this->limiter->dailyLimit();

        if ($to === '' || $waveSize <= 0) {
            return false;
        }

        $sentToday = $this->limiter->sentToday();
        if ($sentToday <= 0) {
            return false;
        }

        $remaining = $this->limiter->remainingToday();
        $campanaFinalizada = $campana !== null && $campana->estado === 'finalizada';
        $limitReached = $remaining <= 0;
        $exactWave = $sentToday % $waveSize === 0;

        if (! $force && ! $limitReached && ! $campanaFinalizada && ! $exactWave) {
            return false;
        }

        $dayKey = Date::now($this->limiter->timezone())->toDateString();
        $cacheKey = $campanaFinalizada && $campana !== null
            ? "campaigns.registry.{$dayKey}.campana.{$campana->id}"
            : "campaigns.registry.{$dayKey}.wave.{$sentToday}";

        if (! $force && ! Cache::add($cacheKey, true, now()->addDay())) {
            return false;
        }

        if ($force) {
            Cache::put($cacheKey, true, now()->addDay());
        }

        $rows = CampanaDestinatario::query()
            ->with(['cliente:id,nombre,apellido,razon_social', 'campana:id,codigo,nombre'])
            ->whereNotNull('enviado_at')
            ->where('enviado_at', '>=', $this->limiter->todayStart())
            ->whereIn('estado', ['enviado', 'entregado', 'abierto', 'click', 'respondido'])
            ->orderBy('enviado_at')
            ->get(['id', 'campana_id', 'cliente_id', 'destino', 'enviado_at', 'estado']);

        $lines = $rows->map(function (CampanaDestinatario $row, int $index) {
            $name = trim(($row->cliente?->nombre ?? '').' '.($row->cliente?->apellido ?? ''));
            if ($name === '') {
                $name = (string) ($row->cliente?->razon_social ?? '—');
            }

            $when = optional($row->enviado_at)?->timezone($this->limiter->timezone())->format('H:i:s') ?? '—';

            return sprintf(
                '%d. %s <%s> — campaña %s — %s',
                $index + 1,
                $name,
                $row->destino,
                $row->campana?->codigo ?? '#'.$row->campana_id,
                $when,
            );
        })->implode("\n");

        $subject = sprintf(
            '[DevNodo Marketing] Registro de envío: %d correos (%s)',
            $sentToday,
            $dayKey,
        );

        $body = implode("\n", [
            'Registro automático de campaña.',
            '',
            'Fecha: '.$dayKey,
            'Enviados hoy: '.$sentToday,
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

            Log::info('Campaign batch registry emailed', [
                'to' => $to,
                'sent_today' => $sentToday,
                'campana_id' => $campana?->id,
            ]);

            return true;
        } catch (Throwable $e) {
            Cache::forget($cacheKey);
            Log::warning('Campaign batch registry failed', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
