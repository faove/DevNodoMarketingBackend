<?php

namespace App\Http\Controllers;

use App\Models\EmailPlantilla;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EmailPlantillaController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('plantillas/index', [
            'plantillas' => EmailPlantilla::query()
                ->withCount('campanas')
                ->orderByDesc('updated_at')
                ->get(),
            'daily_send_limit' => (int) config('campaigns.daily_send_limit', 50),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('plantillas/edit', [
            'plantilla' => null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $plantilla = EmailPlantilla::query()->create($this->validated($request));

        return redirect()
            ->route('plantillas.edit', $plantilla)
            ->with('success', 'Plantilla creada.');
    }

    public function edit(EmailPlantilla $plantilla): Response
    {
        return Inertia::render('plantillas/edit', [
            'plantilla' => $plantilla,
        ]);
    }

    public function update(Request $request, EmailPlantilla $plantilla): RedirectResponse
    {
        $plantilla->update($this->validated($request, $plantilla->id));

        return redirect()
            ->route('plantillas.edit', $plantilla)
            ->with('success', 'Plantilla guardada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?int $plantillaId = null): array
    {
        return $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:60',
                Rule::unique('email_plantillas', 'codigo')->ignore($plantillaId),
            ],
            'nombre' => ['required', 'string', 'max:160'],
            'asunto_default' => ['nullable', 'string', 'max:255'],
            'html' => ['required', 'string'],
            'descripcion' => ['nullable', 'string'],
            'activo' => ['sometimes', 'boolean'],
        ]);
    }
}
