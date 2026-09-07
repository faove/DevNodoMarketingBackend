<?php

namespace App\Services;

use App\Models\Campana;
use App\Models\Cliente;
use App\Models\ClienteContacto;

class EmailTemplateRenderer
{
    /**
     * Renderiza asunto + plantilla_html de una campaña para un cliente puntual.
     *
     * @return array{asunto: string, html: string, rendered_at: string}
     */
    public function renderSnapshot(Campana $campana, Cliente $cliente, ?ClienteContacto $contacto = null): array
    {
        $valores = $this->valores($cliente, $contacto);

        return [
            'asunto' => $this->render((string) $campana->asunto, $valores),
            'html' => $this->render((string) $campana->plantilla_html, $valores),
            'rendered_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Interpola tags `{{namespace.campo}}` en un string, escapando cada valor.
     *
     * @param  array<string, array<string, string>>  $valores
     */
    public function render(string $contenido, array $valores): string
    {
        return preg_replace_callback(
            '/\{\{\s*([a-z0-9_]+)\.([a-z0-9_]+)\s*\}\}/i',
            function (array $match) use ($valores): string {
                $namespace = strtolower($match[1]);
                $campo = strtolower($match[2]);

                if (! array_key_exists($namespace, $valores) || ! array_key_exists($campo, $valores[$namespace])) {
                    return '';
                }

                return e($valores[$namespace][$campo]);
            },
            $contenido
        ) ?? $contenido;
    }

    /**
     * @return array<string, array<string, string>>
     */
    private function valores(Cliente $cliente, ?ClienteContacto $contacto): array
    {
        return [
            'cliente' => [
                'nombre_completo' => $this->nombreCompleto($cliente),
                'nombre' => (string) ($cliente->nombre ?? ''),
                'apellido' => (string) ($cliente->apellido ?? ''),
                'razon_social' => (string) ($cliente->razon_social ?? ''),
                'email' => (string) ($contacto->valor ?? $cliente->email_principal ?? ''),
                'ciudad' => (string) ($cliente->ciudad ?? ''),
                'provincia' => (string) ($cliente->provincia ?? ''),
            ],
            'empresa' => [
                'nombre' => (string) config('empresa.nombre'),
                'email' => (string) config('empresa.email'),
            ],
        ];
    }

    private function nombreCompleto(Cliente $cliente): string
    {
        $nombreApellido = trim(($cliente->nombre ?? '').' '.($cliente->apellido ?? ''));

        if ($nombreApellido !== '') {
            return $nombreApellido;
        }

        if (! empty($cliente->razon_social)) {
            return $cliente->razon_social;
        }

        return 'Estimado/a';
    }
}
