<?php

namespace App\Services;

use App\Models\Campana;
use App\Models\CampanaDestinatario;
use App\Models\Cliente;
use App\Models\ClienteContacto;
use App\Models\Segmento;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class CampaignRecipientResolver
{
    private const CANAL = 'email';

    /**
     * Resuelve y pagina destinatarios (dry run, no persiste nada).
     *
     * @param  array<string, mixed>  $params  cliente_id | segmento_id | filtros
     */
    public function preview(Campana $campana, array $params, int $perPage = 25, int $page = 1): LengthAwarePaginator
    {
        $query = $this->baseQuery($params);

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $existentes = $this->destinosExistentes($campana);

        $paginator->setCollection(
            $paginator->getCollection()->map(fn (Cliente $cliente) => $this->resolveOne($cliente, $params, $existentes))
        );

        return $paginator;
    }

    /**
     * Resuelve todos los clientes que matchean (sin paginar) para construir la audiencia.
     *
     * @param  array<string, mixed>  $params
     * @return Collection<int, array<string, mixed>>
     */
    public function resolveAll(Campana $campana, array $params): Collection
    {
        $existentes = $this->destinosExistentes($campana);
        $resultado = collect();

        $this->baseQuery($params)
            ->chunkById(500, function (Collection $clientes) use (&$resultado, $params, $existentes) {
                foreach ($clientes as $cliente) {
                    $resultado->push($this->resolveOne($cliente, $params, $existentes));
                }
            });

        return $resultado;
    }

    /**
     * Hace upsert de los destinatarios resueltos (válidos y omitidos) en campana_destinatarios,
     * respetando el UNIQUE (campana_id, cliente_id, canal, destino).
     *
     * @param  array<string, mixed>  $params
     * @return array{creados: int, actualizados: int, omitidos: int}
     */
    public function build(Campana $campana, array $params, EmailTemplateRenderer $renderer): array
    {
        $resueltos = $this->resolveAll($campana, $params);

        $filas = [];
        $omitidos = 0;

        foreach ($resueltos as $item) {
            /** @var Cliente $cliente */
            $cliente = $item['cliente'];

            if ($item['motivo'] !== null) {
                $omitidos++;

                if ($item['destino'] === null) {
                    // Sin destino no hay clave única que respetar: no se persiste.
                    continue;
                }
            }

            $snapshot = $renderer->renderSnapshot($campana, $cliente, $item['contacto']);

            $filas[] = [
                'campana_id' => $campana->id,
                'cliente_id' => $cliente->id,
                'canal' => self::CANAL,
                'destino' => $item['destino'],
                'estado' => $item['motivo'] !== null ? 'omitido' : 'pendiente',
                'error_msg' => $item['motivo'],
                'meta_json' => json_encode([
                    'origen' => $item['origen'],
                    'asunto' => $snapshot['asunto'],
                    'html' => $snapshot['html'],
                    'rendered_at' => $snapshot['rendered_at'],
                ]),
            ];
        }

        $creadosOActualizados = 0;

        foreach (array_chunk($filas, 500) as $chunk) {
            CampanaDestinatario::query()->upsert(
                $chunk,
                ['campana_id', 'cliente_id', 'canal', 'destino'],
                ['estado', 'error_msg', 'meta_json']
            );
            $creadosOActualizados += count($chunk);
        }

        return [
            'total' => $resueltos->count(),
            'persistidos' => $creadosOActualizados,
            'omitidos' => $omitidos,
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     */
    private function baseQuery(array $params): Builder
    {
        $query = Cliente::query()->with(['contactos' => fn ($q) => $q->where('tipo', 'email')]);

        if (! empty($params['cliente_id'])) {
            return $query->where('id', (int) $params['cliente_id']);
        }

        if (! empty($params['segmento_id'])) {
            $segmento = Segmento::query()->findOrFail((int) $params['segmento_id']);
            $this->applyReglasSegmento($query, $segmento->reglas_json ?? []);

            return $query;
        }

        $this->applyFiltros($query, $params['filtros'] ?? []);

        return $query;
    }

    /**
     * @param  array<string, mixed>  $reglas
     */
    private function applyReglasSegmento(Builder $query, array $reglas): void
    {
        foreach ((array) ($reglas['require'] ?? []) as $campo) {
            $campo = (string) $campo;
            $query->whereNotNull($campo)->where($campo, '!=', '');
        }

        if (! empty($reglas['estado_not'])) {
            $query->whereNotIn('estado', (array) $reglas['estado_not']);
        }

        if (array_key_exists('opt_in_email', $reglas)) {
            $query->where('opt_in_email', (bool) $reglas['opt_in_email']);
        }

        if (array_key_exists('opt_in_whatsapp', $reglas)) {
            $query->where('opt_in_whatsapp', (bool) $reglas['opt_in_whatsapp']);
        }

        if (! empty($reglas['provincia'])) {
            $query->where('provincia', $reglas['provincia']);
        }

        if (! empty($reglas['origen_tabla'])) {
            $query->where('origen_tabla', $reglas['origen_tabla']);
        }
    }

    /**
     * @param  array<string, mixed>  $filtros
     */
    private function applyFiltros(Builder $query, array $filtros): void
    {
        if (! empty($filtros['con_email'])) {
            $query->withEmail();
        }

        if (! empty($filtros['opt_in_email'])) {
            $query->optInEmail();
        }

        if (! empty($filtros['provincia'])) {
            $query->where('provincia', $filtros['provincia']);
        }

        if (! empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }

        if (! empty($filtros['origen_tabla'])) {
            $query->where('origen_tabla', $filtros['origen_tabla']);
        }
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array{cliente: Cliente, contacto: ?ClienteContacto, canal: string, destino: ?string, origen: ?string, motivo: ?string, duplicado: bool}
     */
    private function resolveOne(Cliente $cliente, array $params, Collection $existentes): array
    {
        $contactoId = ! empty($params['contacto_id']) ? (int) $params['contacto_id'] : null;
        $ignoreOptIn = ! empty($params['ignore_opt_in']);

        [$destino, $origen, $contacto] = $this->resolveDestino($cliente, $contactoId);

        $motivo = $this->motivoOmision($cliente, $destino, $ignoreOptIn);

        return [
            'cliente' => $cliente,
            'contacto' => $contacto,
            'canal' => self::CANAL,
            'destino' => $destino,
            'origen' => $origen,
            'motivo' => $motivo,
            'duplicado' => $destino !== null && $existentes->contains($cliente->id.'|'.$destino),
        ];
    }

    private function motivoOmision(Cliente $cliente, ?string $destino, bool $ignoreOptIn): ?string
    {
        if ($destino === null) {
            return 'sin_email';
        }

        if ($cliente->opt_out_at !== null) {
            return 'opt_out';
        }

        if ($cliente->estado === 'no_contactar') {
            return 'no_contactar';
        }

        if (! $ignoreOptIn && ! $cliente->opt_in_email) {
            return 'sin_opt_in';
        }

        return null;
    }

    /**
     * Prioridad: contacto elegido -> email_principal -> cliente_contactos.es_principal=true.
     *
     * @return array{0: ?string, 1: ?string, 2: ?ClienteContacto}
     */
    private function resolveDestino(Cliente $cliente, ?int $contactoId): array
    {
        if ($contactoId !== null) {
            $contacto = $cliente->contactos->firstWhere('id', $contactoId);

            if ($contacto && $contacto->tipo === 'email' && filled($contacto->valor)) {
                return [$this->normalizar($contacto->valor), 'contacto_elegido', $contacto];
            }
        }

        if (filled($cliente->email_principal)) {
            return [$this->normalizar($cliente->email_principal), 'email_principal', null];
        }

        $principal = $cliente->contactos->firstWhere('es_principal', true);

        if ($principal && filled($principal->valor)) {
            return [$this->normalizar($principal->valor), 'contacto_principal', $principal];
        }

        return [null, null, null];
    }

    private function normalizar(string $email): string
    {
        return strtolower(trim($email));
    }

    /**
     * @return Collection<int, string> claves "cliente_id|destino" ya presentes en campana_destinatarios
     */
    private function destinosExistentes(Campana $campana): Collection
    {
        return CampanaDestinatario::query()
            ->where('campana_id', $campana->id)
            ->where('canal', self::CANAL)
            ->get(['cliente_id', 'destino'])
            ->map(fn (CampanaDestinatario $d) => $d->cliente_id.'|'.$d->destino);
    }
}
