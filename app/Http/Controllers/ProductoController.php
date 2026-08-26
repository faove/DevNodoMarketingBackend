<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductoController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('productos/index', [
            'productos' => Producto::query()
                ->withCount('campanas')
                ->orderBy('nombre')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:40', 'unique:productos,codigo'],
            'nombre' => ['required', 'string', 'max:120'],
            'categoria' => ['required', 'string', 'max:60'],
            'descripcion' => ['nullable', 'string'],
            'url' => ['nullable', 'string', 'max:255'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        Producto::query()->create($data);

        return back()->with('success', 'Producto creado.');
    }

    public function update(Request $request, Producto $producto): RedirectResponse
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:40', Rule::unique('productos', 'codigo')->ignore($producto->id)],
            'nombre' => ['required', 'string', 'max:120'],
            'categoria' => ['required', 'string', 'max:60'],
            'descripcion' => ['nullable', 'string'],
            'url' => ['nullable', 'string', 'max:255'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $producto->update($data);

        return back()->with('success', 'Producto actualizado.');
    }
}
