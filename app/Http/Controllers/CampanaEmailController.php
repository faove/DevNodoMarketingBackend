<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessCampaignSendBatch;
use App\Models\Campana;
use App\Models\CampanaDestinatario;
use App\Models\Cliente;
use App\Models\ClienteContacto;
use App\Services\CampaignRecipientResolver;
use App\Services\CampaignSendLimiter;
use App\Services\EmailTemplateRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class CampanaEmailController extends Controller
{
    private const ESTADOS_EDITABLES = ['borrador', 'programada'];

    public function previewDestinatarios(Request $request, Campana $campana, CampaignRecipientResolver $resolver, EmailTemplateRenderer $renderer): JsonResponse
    {
        $params = $this->resolveParams($request);

        $paginator = $resolver->preview(
            $campana,
            $params,
            (int) $request->integer('per_page', 25),
            (int) $request->integer('page', 1),
        );

        $paginator->through(function (array $item) use ($campana, $renderer) {
            /** @var Cliente $cliente */
            $cliente = $item['cliente'];
            $snapshot = $renderer->renderSnapshot($campana, $cliente, $item['contacto']);

            return [
                'cliente' => [
                    'id' => $cliente->id,
                    'nombre_completo' => trim(($cliente->nombre ?? '').' '.($cliente->apellido ?? '')) ?: $cliente->razon_social,
                    'razon_social' => $cliente->razon_social,
                ],
                'destino' => $item['destino'],
                'origen' => $item['origen'],
                'asunto_renderizado' => $snapshot['asunto'],
                'opt_in_email' => $cliente->opt_in_email,
                'omitido' => $item['motivo'] !== null,
                'motivo' => $item['motivo'],
                'duplicado' => $item['duplicado'],
            ];
        });

        return response()->json($paginator);
    }

    public function emailPreview(Request $request, Campana $campana, EmailTemplateRenderer $renderer): JsonResponse
    {
        $data = $request->validate([
            'cliente_id' => ['required', 'integer', 'exists:clientes,id'],
            'contacto_id' => ['nullable', 'integer', 'exists:cliente_contactos,id'],
        ]);

        $cliente = Cliente::query()->findOrFail($data['cliente_id']);
        $contacto = isset($data['contacto_id'])
            ? ClienteContacto::query()->where('cliente_id', $cliente->id)->where('tipo', 'email')->find($data['contacto_id'])
            : null;

        $snapshot = $renderer->renderSnapshot($campana, $cliente, $contacto);
        $to = $contacto?->valor ?? $cliente->email_principal;
        if ($to !== null && filter_var(strtolower(trim((string) $to)), FILTER_VALIDATE_EMAIL) === false) {
            $to = null;
        }

        return response()->json([
            'to' => $to,
            'from' => config('empresa.email'),
            'asunto' => $snapshot['asunto'],
            'html' => $snapshot['html'],
            'cliente' => [
                'id' => $cliente->id,
                'nombre_completo' => trim(($cliente->nombre ?? '').' '.($cliente->apellido ?? '')) ?: $cliente->razon_social,
            ],
        ]);
    }

    public function buildDestinatarios(Request $request, Campana $campana, CampaignRecipientResolver $resolver, EmailTemplateRenderer $renderer): JsonResponse
    {
        $this->assertEditable($campana);

        $params = $this->resolveParams($request);
        $resumen = $resolver->build($campana, $params, $renderer);

        return response()->json($resumen);
    }

    public function sendTest(Request $request, Campana $campana, EmailTemplateRenderer $renderer): JsonResponse
    {
        $this->assertEditable($campana);

        $data = $request->validate([
            'to' => ['required', 'email'],
            'cliente_id' => ['required', 'integer', 'exists:clientes,id'],
            'contacto_id' => ['nullable', 'integer', 'exists:cliente_contactos,id'],
        ]);

        $cliente = Cliente::query()->findOrFail($data['cliente_id']);
        $contacto = isset($data['contacto_id'])
            ? ClienteContacto::query()->where('cliente_id', $cliente->id)->where('tipo', 'email')->find($data['contacto_id'])
            : null;

        $snapshot = $renderer->renderSnapshot($campana, $cliente, $contacto);

        Mail::html($snapshot['html'], function ($message) use ($data, $snapshot) {
            $message->to($data['to'])
                ->subject('[PRUEBA] '.$snapshot['asunto']);
        });

        return response()->json(['enviado' => true, 'to' => $data['to']]);
    }

    public function send(Campana $campana, CampaignSendLimiter $limiter): JsonResponse
    {
        if (! in_array($campana->estado, ['borrador', 'programada', 'pausada', 'activa'], true)) {
            throw ValidationException::withMessages([
                'campana' => 'La campaña no puede enviarse en estado '.$campana->estado.'.',
            ]);
        }

        if (blank($campana->asunto) || blank($campana->plantilla_html)) {
            throw ValidationException::withMessages([
                'campana' => 'La campaña necesita asunto y plantilla HTML antes de enviar.',
            ]);
        }

        $pendientes = CampanaDestinatario::query()
            ->where('campana_id', $campana->id)
            ->where('estado', 'pendiente')
            ->where('canal', 'email')
            ->count();

        if ($pendientes === 0) {
            throw ValidationException::withMessages([
                'campana' => 'No hay destinatarios pendientes. Confirmá la audiencia primero.',
            ]);
        }

        $remaining = $limiter->remainingToday();
        if ($remaining <= 0) {
            throw ValidationException::withMessages([
                'campana' => 'Se alcanzó el tope diario de '.$limiter->dailyLimit().' envíos. Reintentá mañana.',
            ]);
        }

        $campana->update([
            'estado' => 'activa',
            'iniciada_at' => $campana->iniciada_at ?? now(),
            'finalizada_at' => null,
        ]);

        ProcessCampaignSendBatch::dispatch($campana->id);

        return response()->json([
            'queued' => true,
            'pendientes' => $pendientes,
            'daily_limit' => $limiter->dailyLimit(),
            'remaining_today' => $remaining,
            'will_send_today' => min($pendientes, $remaining),
        ]);
    }

    public function sendStatus(Campana $campana, CampaignSendLimiter $limiter): JsonResponse
    {
        $counts = CampanaDestinatario::query()
            ->where('campana_id', $campana->id)
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return response()->json([
            'campana' => [
                'id' => $campana->id,
                'estado' => $campana->estado,
                'iniciada_at' => $campana->iniciada_at,
                'finalizada_at' => $campana->finalizada_at,
            ],
            'estado_counts' => $counts,
            'daily_limit' => $limiter->dailyLimit(),
            'sent_today' => $limiter->sentToday(),
            'remaining_today' => $limiter->remainingToday(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveParams(Request $request): array
    {
        $filtrosInput = $request->input('filtros', []);
        if (! is_array($filtrosInput)) {
            $filtrosInput = [];
        }

        return [
            'cliente_id' => $request->integer('cliente_id') ?: null,
            'segmento_id' => $request->integer('segmento_id') ?: null,
            'contacto_id' => $request->integer('contacto_id') ?: null,
            'ignore_opt_in' => $request->boolean('ignore_opt_in'),
            'filtros' => [
                'con_email' => (bool) ($filtrosInput['con_email'] ?? $request->boolean('con_email')),
                'opt_in_email' => (bool) ($filtrosInput['opt_in_email'] ?? $request->boolean('opt_in_email')),
                'provincia' => ($filtrosInput['provincia'] ?? $request->string('provincia')->toString()) ?: null,
                'estado' => ($filtrosInput['estado'] ?? $request->string('estado')->toString()) ?: null,
                'origen_tabla' => ($filtrosInput['origen_tabla'] ?? $request->string('origen_tabla')->toString()) ?: null,
            ],
        ];
    }

    private function assertEditable(Campana $campana): void
    {
        if (! in_array($campana->estado, self::ESTADOS_EDITABLES, true)) {
            throw ValidationException::withMessages([
                'campana' => 'Solo se puede editar el email mientras la campaña está en borrador o programada.',
            ]);
        }
    }
}
