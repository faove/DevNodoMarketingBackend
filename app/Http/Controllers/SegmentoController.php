<?php

namespace App\Http\Controllers;

use App\Models\Segmento;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SegmentoController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('segmentos/index', [
            'segmentos' => Segmento::query()->orderBy('nombre')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:60', 'unique:segmentos,codigo'],
            'nombre' => ['required', 'string', 'max:120'],
            'descripcion' => ['nullable', 'string'],
            'reglas_json' => ['nullable', 'array'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        Segmento::query()->create($data);

        return back()->with('success', 'Segmento creado.');
    }

    public function update(Request $request, Segmento $segmento): RedirectResponse
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:60', Rule::unique('segmentos', 'codigo')->ignore($segmento->id)],
            'nombre' => ['required', 'string', 'max:120'],
            'descripcion' => ['nullable', 'string'],
            'reglas_json' => ['nullable', 'array'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $segmento->update($data);

        return back()->with('success', 'Segmento actualizado.');
    }
}
