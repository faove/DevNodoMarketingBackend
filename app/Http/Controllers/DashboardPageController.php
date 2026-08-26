<?php

namespace App\Http\Controllers;

use App\Models\Campana;
use App\Models\Cliente;
use App\Models\Interaccion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardPageController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $campaignsByEstado = Campana::query()
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return Inertia::render('dashboard', [
            'stats' => [
                'clientes' => Cliente::query()->count(),
                'clientes_con_email' => Cliente::query()->withEmail()->count(),
                'clientes_opt_in_email' => Cliente::query()->optInEmail()->count(),
                'campanas' => Campana::query()->count(),
                'campanas_activas' => Campana::query()->where('estado', 'activa')->count(),
                'interacciones' => Interaccion::query()->count(),
                'interacciones_inbound' => Interaccion::query()->inbound()->count(),
            ],
            'campaignsByEstado' => $campaignsByEstado,
            'recentInteractions' => Interaccion::query()
                ->with(['cliente:id,razon_social,nombre,apellido,email_principal', 'campana:id,nombre,codigo'])
                ->orderByDesc('ocurrio_at')
                ->limit(12)
                ->get(),
        ]);
    }
}
