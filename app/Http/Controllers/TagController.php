<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TagController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('tags/index', [
            'tags' => Tag::query()
                ->withCount('clientes')
                ->orderBy('nombre')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:60', 'unique:tags,codigo'],
            'nombre' => ['required', 'string', 'max:120'],
            'color' => ['nullable', 'string', 'max:20'],
            'descripcion' => ['nullable', 'string'],
        ]);

        Tag::query()->create($data);

        return back()->with('success', 'Tag creado.');
    }

    public function update(Request $request, Tag $tag): RedirectResponse
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:60', Rule::unique('tags', 'codigo')->ignore($tag->id)],
            'nombre' => ['required', 'string', 'max:120'],
            'color' => ['nullable', 'string', 'max:20'],
            'descripcion' => ['nullable', 'string'],
        ]);

        $tag->update($data);

        return back()->with('success', 'Tag actualizado.');
    }
}
