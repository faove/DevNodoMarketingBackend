<?php

namespace App\Jobs;

use App\Models\Campana;
use App\Models\CampanaDestinatario;
use App\Models\Interaccion;
use App\Services\CampaignSendLimiter;
use App\Services\EmailTemplateRenderer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ProcessCampaignSendBatch implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public int $campanaId) {}

    public function handle(CampaignSendLimiter $limiter, EmailTemplateRenderer $renderer): void
    {
        $campana = Campana::query()->with('producto:id,nombre,codigo')->find($this->campanaId);
        if ($campana === null) {
            return;
        }

        if (! in_array($campana->estado, ['activa', 'programada'], true)) {
            return;
        }

        if ($campana->estado === 'programada') {
            $campana->update([
                'estado' => 'activa',
                'iniciada_at' => $campana->iniciada_at ?? now(),
            ]);
        }

        $remaining = $limiter->remainingToday();
        if ($remaining <= 0) {
            Log::info('Campaign send paused: daily limit reached', [
                'campana_id' => $campana->id,
                'daily_limit' => $limiter->dailyLimit(),
            ]);

            return;
        }

        $take = min($limiter->batchSize(), $remaining);
        $destinatarios = CampanaDestinatario::query()
            ->with('cliente')
            ->where('campana_id', $campana->id)
            ->where('estado', 'pendiente')
            ->where('canal', 'email')
            ->orderBy('id')
            ->limit($take)
            ->get();

        if ($destinatarios->isEmpty()) {
            $stillPending = CampanaDestinatario::query()
                ->where('campana_id', $campana->id)
                ->where('estado', 'pendiente')
                ->exists();

            if (! $stillPending) {
                $campana->update([
                    'estado' => 'finalizada',
                    'finalizada_at' => now(),
                ]);
            }

            return;
        }

        foreach ($destinatarios as $destinatario) {
            $this->sendOne($campana, $destinatario, $renderer);
        }

        $stillPending = CampanaDestinatario::query()
            ->where('campana_id', $campana->id)
            ->where('estado', 'pendiente')
            ->exists();

        if (! $stillPending) {
            $campana->update([
                'estado' => 'finalizada',
                'finalizada_at' => now(),
            ]);

            return;
        }

        if ($limiter->remainingToday() > 0) {
            self::dispatch($campana->id)->delay(now()->addSeconds(5));
        }
    }

    private function sendOne(Campana $campana, CampanaDestinatario $destinatario, EmailTemplateRenderer $renderer): void
    {
        $cliente = $destinatario->cliente;
        if ($cliente === null || blank($destinatario->destino)) {
            $destinatario->update([
                'estado' => 'omitido',
                'error_msg' => 'sin_email',
            ]);

            return;
        }

        $meta = is_array($destinatario->meta_json) ? $destinatario->meta_json : [];
        $asunto = (string) ($meta['asunto'] ?? $campana->asunto ?? $campana->nombre);
        $html = (string) ($meta['html'] ?? $campana->plantilla_html ?? '');

        if ($html === '') {
            $snapshot = $renderer->renderSnapshot($campana, $cliente);
            $asunto = $snapshot['asunto'];
            $html = $snapshot['html'];
        }

        try {
            Mail::html($html, function ($message) use ($destinatario, $asunto) {
                $message->to($destinatario->destino)->subject($asunto);
            });

            $destinatario->update([
                'estado' => 'enviado',
                'enviado_at' => now(),
                'error_msg' => null,
            ]);

            Interaccion::query()->create([
                'cliente_id' => $cliente->id,
                'campana_id' => $campana->id,
                'canal' => 'email',
                'direccion' => 'outbound',
                'tipo' => 'email_enviado',
                'asunto' => $asunto,
                'detalle' => 'Enviado a '.$destinatario->destino,
                'resultado' => 'enviado',
                'ocurrio_at' => now(),
                'meta_json' => [
                    'destino' => $destinatario->destino,
                    'destinatario_id' => $destinatario->id,
                ],
            ]);
        } catch (Throwable $e) {
            Log::warning('Campaign email send failed', [
                'campana_id' => $campana->id,
                'destinatario_id' => $destinatario->id,
                'error' => $e->getMessage(),
            ]);

            $destinatario->update([
                'estado' => 'fallido',
                'error_msg' => mb_substr($e->getMessage(), 0, 500),
            ]);
        }
    }
}
