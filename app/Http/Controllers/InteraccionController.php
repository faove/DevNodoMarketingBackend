<?php

namespace App\Http\Controllers;

use App\Models\Interaccion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InteraccionController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Interaccion::query()
            ->with([
                'cliente:id,razon_social,nombre,apellido,email_principal',
                'campana:id,nombre,codigo',
            ]);

        if ($direccion = $request->string('direccion')->toString()) {
            $query->where('direccion', $direccion);
        }

        if ($canal = $request->string('canal')->toString()) {
            $query->where('canal', $canal);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('asunto', 'ilike', "%{$search}%")
                    ->orWhere('tipo', 'ilike', "%{$search}%")
                    ->orWhere('detalle', 'ilike', "%{$search}%");
            });
        }

        $interacciones = $query
            ->orderByDesc('ocurrio_at')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('interacciones/index', [
            'interacciones' => $interacciones,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'direccion' => $request->string('direccion')->toString(),
                'canal' => $request->string('canal')->toString(),
            ],
        ]);
    }
}
