<?php

namespace App\Http\Controllers;

use App\Models\Campana;
use App\Models\Cliente;
use App\Models\ClienteContacto;
use App\Services\CampaignRecipientResolver;
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
        $to = $contacto->valor ?? $cliente->email_principal;

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

    /**
     * @return array<string, mixed>
     */
    private function resolveParams(Request $request): array
    {
        return [
            'cliente_id' => $request->integer('cliente_id') ?: null,
            'segmento_id' => $request->integer('segmento_id') ?: null,
            'contacto_id' => $request->integer('contacto_id') ?: null,
            'ignore_opt_in' => $request->boolean('ignore_opt_in'),
            'filtros' => [
                'con_email' => $request->boolean('con_email'),
                'opt_in_email' => $request->boolean('opt_in_email'),
                'provincia' => $request->string('provincia')->toString() ?: null,
                'estado' => $request->string('estado')->toString() ?: null,
                'origen_tabla' => $request->string('origen_tabla')->toString() ?: null,
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
