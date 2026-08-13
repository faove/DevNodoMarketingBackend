<?php

namespace App\Http\Controllers;

use App\Models\Campana;
use App\Models\Cliente;
use App\Models\Interaccion;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        return response()->json([
            'clientes' => Cliente::query()->count(),
            'clientes_con_email' => Cliente::query()->withEmail()->count(),
            'clientes_opt_in_email' => Cliente::query()->optInEmail()->count(),
            'productos' => Producto::query()->activo()->count(),
            'campanas' => Campana::query()->count(),
            'interacciones' => Interaccion::query()->count(),
            'interacciones_inbound' => Interaccion::query()->inbound()->count(),
        ]);
    }
}
