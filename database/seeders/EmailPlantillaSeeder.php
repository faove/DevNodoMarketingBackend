<?php

namespace Database\Seeders;

use App\Models\EmailPlantilla;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class EmailPlantillaSeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path('docs/Email HTML para devnodo/devnodo-email-automatizacion.html');
        $html = File::exists($path)
            ? File::get($path)
            : '<p>Plantilla DevNodo — reemplazar contenido.</p>';

        EmailPlantilla::query()->updateOrCreate(
            ['codigo' => 'automatizacion-procesos'],
            [
                'nombre' => 'Automatización de procesos',
                'asunto_default' => 'Tu equipo no necesita más planillas. Necesita menos pasos manuales.',
                'html' => $html,
                'descripcion' => 'Plantilla outreach DevNodo (stock, cotizaciones, WhatsApp, compras).',
                'activo' => true,
            ],
        );
    }
}
