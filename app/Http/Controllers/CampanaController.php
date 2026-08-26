<?php

namespace App\Http\Controllers;

use App\Models\Campana;
use App\Models\Producto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CampanaController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Campana::query()->with('producto:id,nombre,codigo');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('codigo', 'ilike', "%{$search}%")
                    ->orWhere('asunto', 'ilike', "%{$search}%");
            });
        }

        if ($estado = $request->string('estado')->toString()) {
            $query->where('estado', $estado);
        }

        if ($canal = $request->string('canal')->toString()) {
            $query->where('canal', $canal);
        }

        $campanas = $query
            ->withCount('destinatarios')
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('campanas/index', [
            'campanas' => $campanas,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'estado' => $request->string('estado')->toString(),
                'canal' => $request->string('canal')->toString(),
            ],
            'productos' => Producto::query()->activo()->orderBy('nombre')->get(['id', 'nombre', 'codigo']),
        ]);
    }

    public function show(Campana $campana): Response
    {
        $campana->load(['producto:id,nombre,codigo']);
        $campana->loadCount('destinatarios');

        $destinatarios = $campana->destinatarios()
            ->with('cliente:id,razon_social,nombre,apellido,email_principal')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        $estadoCounts = $campana->destinatarios()
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return Inertia::render('campanas/show', [
            'campana' => $campana,
            'destinatarios' => $destinatarios,
            'estadoCounts' => $estadoCounts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $campana = Campana::query()->create($data);

        return redirect()
            ->route('campanas.show', $campana)
            ->with('success', 'Campaña creada.');
    }

    public function update(Request $request, Campana $campana): RedirectResponse
    {
        $campana->update($this->validated($request, $campana->id));

        return redirect()
            ->route('campanas.show', $campana)
            ->with('success', 'Campaña actualizada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?int $campanaId = null): array
    {
        return $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:60',
                Rule::unique('campanas', 'codigo')->ignore($campanaId),
            ],
            'nombre' => ['required', 'string', 'max:160'],
            'canal' => ['required', Rule::in(['email', 'sms', 'whatsapp', 'llamada', 'ads', 'mixto'])],
            'objetivo' => ['nullable', 'string', 'max:200'],
            'producto_id' => ['nullable', 'integer', 'exists:productos,id'],
            'estado' => ['required', Rule::in(['borrador', 'programada', 'activa', 'pausada', 'finalizada'])],
            'asunto' => ['nullable', 'string', 'max:255'],
            'mensaje_preview' => ['nullable', 'string'],
            'plantilla_html' => ['nullable', 'string'],
            'programada_at' => ['nullable', 'date'],
        ]);
    }
}
