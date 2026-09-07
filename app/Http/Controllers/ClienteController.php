<?php

namespace App\Http\Controllers;

use App\Models\Campana;
use App\Models\Cliente;
use App\Models\ClienteContacto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClienteController extends Controller
{
    public function buscar(Request $request): JsonResponse
    {
        $search = $request->string('q')->trim()->toString();

        $query = Cliente::query()->with(['contactos' => fn ($q) => $q->where('tipo', 'email')]);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('razon_social', 'ilike', "%{$search}%")
                    ->orWhere('nombre', 'ilike', "%{$search}%")
                    ->orWhere('apellido', 'ilike', "%{$search}%")
                    ->orWhere('email_principal', 'ilike', "%{$search}%");
            });
        }

        $clientes = $query
            ->orderBy('direccion')
            ->orderBy('id')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $clientes->map(fn (Cliente $cliente) => [
                'id' => $cliente->id,
                'nombre_completo' => trim(($cliente->nombre ?? '').' '.($cliente->apellido ?? '')) ?: $cliente->razon_social ?: "Cliente #{$cliente->id}",
                'nombre' => $cliente->nombre,
                'apellido' => $cliente->apellido,
                'razon_social' => $cliente->razon_social,
                'ciudad' => $cliente->ciudad,
                'provincia' => $cliente->provincia,
                'email_principal' => $cliente->email_principal,
                'opt_in_email' => $cliente->opt_in_email,
                'contactos_email' => $cliente->contactos->map(fn (ClienteContacto $c) => [
                    'id' => $c->id,
                    'valor' => $c->valor,
                    'etiqueta' => $c->etiqueta,
                ])->values(),
            ]),
        ]);
    }

    public function index(Request $request): Response
    {
        $query = Cliente::query();

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('razon_social', 'ilike', "%{$search}%")
                    ->orWhere('nombre', 'ilike', "%{$search}%")
                    ->orWhere('apellido', 'ilike', "%{$search}%")
                    ->orWhere('email_principal', 'ilike', "%{$search}%")
                    ->orWhere('telefono_principal', 'ilike', "%{$search}%")
                    ->orWhere('cuit_cuil', 'ilike', "%{$search}%")
                    ->orWhere('direccion', 'ilike', "%{$search}%")
                    ->orWhere('ciudad', 'ilike', "%{$search}%");
            });
        }

        if ($estado = $request->string('estado')->toString()) {
            $query->where('estado', $estado);
        }

        if ($request->boolean('con_email')) {
            $query->withEmail();
        }

        if ($request->boolean('opt_in_email')) {
            $query->optInEmail();
        }

        if ($provincia = $request->string('provincia')->toString()) {
            $query->where('provincia', $provincia);
        }

        $sort = $request->string('sort')->toString() ?: 'direccion';
        $direction = $request->string('direction')->toString() === 'desc' ? 'desc' : 'asc';
        $allowedSorts = ['direccion', 'razon_social', 'email_principal', 'ciudad', 'estado', 'created_at', 'score'];

        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'direccion';
        }

        $clientes = $query
            ->orderBy($sort, $direction)
            ->orderBy('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('clientes/index', [
            'clientes' => $clientes,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'estado' => $request->string('estado')->toString(),
                'con_email' => $request->boolean('con_email'),
                'opt_in_email' => $request->boolean('opt_in_email'),
                'provincia' => $request->string('provincia')->toString(),
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function show(Cliente $cliente): Response
    {
        $cliente->load([
            'contactos',
            'tags',
            'intereses.producto',
            'campanaDestinatarios.campana:id,nombre,codigo,estado',
            'interacciones' => fn ($q) => $q->orderByDesc('ocurrio_at')->limit(20),
            'consentimientos' => fn ($q) => $q->orderByDesc('registrado_at')->limit(10),
        ]);

        $campanasEmailBorrador = Campana::query()
            ->where('estado', 'borrador')
            ->where('canal', 'email')
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get(['id', 'codigo', 'nombre']);

        return Inertia::render('clientes/show', [
            'cliente' => $cliente,
            'campanasEmailBorrador' => $campanasEmailBorrador,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $cliente = Cliente::query()->create($data);

        return redirect()
            ->route('clientes.show', $cliente)
            ->with('success', 'Cliente creado.');
    }

    public function update(Request $request, Cliente $cliente): RedirectResponse
    {
        $cliente->update($this->validated($request, $cliente->id));

        return redirect()
            ->route('clientes.show', $cliente)
            ->with('success', 'Cliente actualizado.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?int $clienteId = null): array
    {
        return $request->validate([
            'tipo' => ['nullable', Rule::in(['lead', 'prospect', 'cliente', 'partner'])],
            'razon_social' => ['nullable', 'string', 'max:200'],
            'nombre' => ['nullable', 'string', 'max:120'],
            'apellido' => ['nullable', 'string', 'max:120'],
            'nombre_fantasia' => ['nullable', 'string', 'max:200'],
            'email_principal' => ['nullable', 'email', 'max:200'],
            'telefono_principal' => ['nullable', 'string', 'max:40'],
            'whatsapp' => ['nullable', 'string', 'max:40'],
            'direccion' => ['nullable', 'string'],
            'ciudad' => ['nullable', 'string', 'max:120'],
            'provincia' => ['nullable', 'string', 'max:80'],
            'pais' => ['nullable', 'string', 'max:80'],
            'codigo_postal' => ['nullable', 'string', 'max:20'],
            'cuit_cuil' => ['nullable', 'string', 'max:13'],
            'estado' => ['nullable', Rule::in([
                'nuevo', 'contactado', 'calificado', 'propuesta',
                'negociacion', 'ganado', 'perdido', 'no_contactar',
            ])],
            'opt_in_email' => ['sometimes', 'boolean'],
            'opt_in_whatsapp' => ['sometimes', 'boolean'],
            'notas' => ['nullable', 'string'],
            'sector' => ['nullable', 'string', 'max:80'],
            'rubro' => ['nullable', 'string', 'max:120'],
        ]);
    }
}
