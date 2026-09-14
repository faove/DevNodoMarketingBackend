<?php

namespace App\Services;

use App\Jobs\ProcessCampaignSendBatch;
use App\Models\Campana;
use App\Models\CampanaDestinatario;
use App\Models\Cliente;
use App\Models\EmailPlantilla;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class CampaignDailyBatchService
{
    public function __construct(
        private CampaignSendLimiter $limiter,
        private CampaignRecipientResolver $resolver,
        private EmailTemplateRenderer $renderer,
    ) {}

    /**
     * Import missing leads if needed, create today's campaign, and queue sends.
     *
     * @return array{
     *     status: string,
     *     message: string,
     *     campana_id?: int,
     *     codigo?: string,
     *     imported?: int,
     *     selected?: int,
     *     pendientes?: int,
     *     remaining_today?: int
     * }
     */
    public function dispatch(bool $dryRun = false, bool $force = false): array
    {
        if (! (bool) config('campaigns.daily_auto_enabled', true)) {
            return ['status' => 'disabled', 'message' => 'Daily auto batch is disabled.'];
        }

        $tz = (string) config('campaigns.daily_auto_timezone', 'America/Argentina/Buenos_Aires');
        $dayKey = Date::now($tz)->toDateString();
        $lockKey = "campaigns.daily_batch.{$dayKey}";

        if (! $force && ! $dryRun && ! Cache::add($lockKey, true, now()->addDay())) {
            return ['status' => 'skipped', 'message' => "Daily batch already dispatched for {$dayKey}."];
        }

        $remaining = $this->limiter->remainingToday();
        if ($remaining <= 0) {
            return [
                'status' => 'skipped',
                'message' => 'Daily send limit already reached.',
                'remaining_today' => 0,
            ];
        }

        $active = Campana::query()
            ->where('canal', 'email')
            ->whereIn('estado', ['activa', 'programada'])
            ->whereHas('destinatarios', fn ($q) => $q->where('estado', 'pendiente'))
            ->orderBy('id')
            ->first();

        if ($active !== null) {
            if (! $dryRun) {
                ProcessCampaignSendBatch::dispatch($active->id);
            }

            return [
                'status' => 'continued',
                'message' => "Continued existing campaign #{$active->id}.",
                'campana_id' => $active->id,
                'codigo' => $active->codigo,
                'remaining_today' => $remaining,
            ];
        }

        $target = min($remaining, max(1, (int) config('campaigns.daily_send_limit', 50)));
        $available = $this->unsentClienteIds($target);
        $imported = 0;

        if ($available->count() < $target) {
            $need = $target - $available->count();
            $imported = $dryRun ? $need : $this->importFromCsv($need);
            $available = $this->unsentClienteIds($target);
        }

        if ($available->isEmpty()) {
            if (! $force && ! $dryRun) {
                Cache::forget($lockKey);
            }

            return [
                'status' => 'empty',
                'message' => 'No unsent clients available (CSV import yielded nothing).',
                'imported' => $imported,
                'remaining_today' => $remaining,
            ];
        }

        $plantillaCodigo = (string) config('campaigns.daily_auto_plantilla', 'automatizacion-procesos');
        $plantilla = EmailPlantilla::query()
            ->where('codigo', $plantillaCodigo)
            ->where('activo', true)
            ->first();

        if ($plantilla === null || blank($plantilla->html) || blank($plantilla->asunto_default)) {
            if (! $force && ! $dryRun) {
                Cache::forget($lockKey);
            }

            throw new RuntimeException("Active plantilla [{$plantillaCodigo}] with html/asunto is required.");
        }

        if ($dryRun) {
            return [
                'status' => 'dry_run',
                'message' => 'Dry run only; no campaign created.',
                'imported' => $imported,
                'selected' => $available->count(),
                'remaining_today' => $remaining,
            ];
        }

        $campana = Campana::query()->create([
            'codigo' => 'outreach-auto-'.Date::now($tz)->format('Ymd-His'),
            'nombre' => 'Outreach automático diario',
            'canal' => 'email',
            'objetivo' => 'Lote diario automático ('.$target.' cupos)',
            'plantilla_id' => $plantilla->id,
            'estado' => 'borrador',
            'asunto' => $plantilla->asunto_default,
            'mensaje_preview' => $plantilla->nombre,
            'plantilla_html' => $plantilla->html,
        ]);

        $persistidos = 0;
        foreach ($available as $clienteId) {
            $resumen = $this->resolver->build($campana, [
                'cliente_id' => (int) $clienteId,
                'ignore_opt_in' => (bool) config('campaigns.daily_auto_ignore_opt_in', true),
                'filtros' => ['con_email' => true],
            ], $this->renderer);
            $persistidos += (int) ($resumen['persistidos'] ?? 0);
        }

        $pendientes = CampanaDestinatario::query()
            ->where('campana_id', $campana->id)
            ->where('estado', 'pendiente')
            ->count();

        if ($pendientes === 0) {
            $campana->update([
                'estado' => 'finalizada',
                'finalizada_at' => now(),
            ]);
            Cache::forget($lockKey);

            return [
                'status' => 'empty',
                'message' => 'Campaign built with zero pending recipients.',
                'campana_id' => $campana->id,
                'codigo' => $campana->codigo,
                'imported' => $imported,
                'selected' => $available->count(),
                'pendientes' => 0,
            ];
        }

        $campana->update([
            'estado' => 'activa',
            'iniciada_at' => now(),
            'finalizada_at' => null,
        ]);

        ProcessCampaignSendBatch::dispatch($campana->id);

        Log::info('Daily campaign batch dispatched', [
            'campana_id' => $campana->id,
            'pendientes' => $pendientes,
            'imported' => $imported,
        ]);

        return [
            'status' => 'queued',
            'message' => 'Daily campaign queued.',
            'campana_id' => $campana->id,
            'codigo' => $campana->codigo,
            'imported' => $imported,
            'selected' => $available->count(),
            'pendientes' => $pendientes,
            'remaining_today' => $remaining,
            'persistidos' => $persistidos,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int, int>
     */
    private function unsentClienteIds(int $limit)
    {
        $touched = CampanaDestinatario::query()
            ->whereIn('estado', ['enviado', 'entregado', 'abierto', 'click', 'respondido', 'pendiente'])
            ->distinct()
            ->pluck('cliente_id')
            ->filter()
            ->all();

        return Cliente::query()
            ->whereNotNull('email_principal')
            ->where('email_principal', '!=', '')
            ->when(count($touched) > 0, fn ($q) => $q->whereNotIn('id', $touched))
            ->where('estado', '!=', 'no_contactar')
            ->whereNull('opt_out_at')
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id');
    }

    private function importFromCsv(int $need): int
    {
        $path = (string) (config('campaigns.daily_auto_csv') ?: storage_path('exports/clientes_contribuyentes.csv'));

        if ($need <= 0 || ! File::isFile($path)) {
            Log::warning('Daily batch CSV missing or nothing to import', ['path' => $path, 'need' => $need]);

            return 0;
        }

        $fh = fopen($path, 'r');
        if ($fh === false) {
            return 0;
        }

        $header = fgetcsv($fh, 0, ',', '"', '\\');
        if ($header === false) {
            fclose($fh);

            return 0;
        }

        $cols = array_flip($header);
        $imported = 0;

        while ($imported < $need && ($row = fgetcsv($fh, 0, ',', '"', '\\')) !== false) {
            $email = $this->csvValue($row, $cols, 'email');
            if ($email === null || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                continue;
            }

            if (Cliente::query()->whereRaw('lower(email_principal) = ?', [strtolower($email)])->exists()) {
                continue;
            }

            $uuid = $this->csvValue($row, $cols, 'uuid') ?: (string) Str::uuid();
            if (Cliente::query()->where('uuid', $uuid)->exists()) {
                $uuid = (string) Str::uuid();
            }

            try {
                Cliente::query()->create([
                    'uuid' => $uuid,
                    'tipo' => $this->csvValue($row, $cols, 'tipo') ?: 'lead',
                    'razon_social' => $this->csvValue($row, $cols, 'razon_social'),
                    'nombre' => $this->csvValue($row, $cols, 'nombre'),
                    'apellido' => $this->csvValue($row, $cols, 'apellido'),
                    'nombre_fantasia' => $this->csvValue($row, $cols, 'nombre_fantasia'),
                    'documento_tipo' => $this->csvValue($row, $cols, 'documento_tipo'),
                    'documento_nro' => $this->csvValue($row, $cols, 'documento_nro'),
                    'cuit_cuil' => $this->csvValue($row, $cols, 'cuit_cuil'),
                    'email_principal' => $email,
                    'telefono_principal' => $this->csvValue($row, $cols, 'telefono'),
                    'whatsapp' => $this->csvValue($row, $cols, 'whatsapp'),
                    'sitio_web' => $this->csvValue($row, $cols, 'sitio_web'),
                    'sector' => $this->csvValue($row, $cols, 'sector'),
                    'rubro' => $this->csvValue($row, $cols, 'rubro'),
                    'empresa_tamano' => $this->normalizeEmpresaTamano($this->csvValue($row, $cols, 'empresa_tamano')),
                    'ciudad' => $this->csvValue($row, $cols, 'ciudad'),
                    'provincia' => $this->csvValue($row, $cols, 'provincia') ?: 'Córdoba',
                    'pais' => $this->csvValue($row, $cols, 'pais') ?: 'Argentina',
                    'codigo_postal' => $this->csvValue($row, $cols, 'codigo_postal'),
                    'direccion' => $this->csvValue($row, $cols, 'direccion'),
                    'latitud' => $this->csvValue($row, $cols, 'latitud'),
                    'longitud' => $this->csvValue($row, $cols, 'longitud'),
                    'fuente' => $this->csvValue($row, $cols, 'fuente') ?: 'sam_etl',
                    'origen_tabla' => $this->csvValue($row, $cols, 'origen_tabla'),
                    'origen_id' => $this->csvValue($row, $cols, 'origen_id'),
                    'score' => (int) ($this->csvValue($row, $cols, 'score') ?: 0),
                    'estado' => $this->csvValue($row, $cols, 'estado') ?: 'nuevo',
                    'opt_in_email' => $this->csvBool($this->csvValue($row, $cols, 'opt_in_email')),
                    'opt_in_whatsapp' => $this->csvBool($this->csvValue($row, $cols, 'opt_in_whatsapp')),
                ]);
                $imported++;
            } catch (\Throwable $e) {
                Log::warning('Daily batch CSV row skipped', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        fclose($fh);

        return $imported;
    }

    /**
     * @param  array<int, string|null>  $row
     * @param  array<string, int>  $cols
     */
    private function csvValue(array $row, array $cols, string $key): ?string
    {
        if (! isset($cols[$key])) {
            return null;
        }

        $value = trim((string) ($row[$cols[$key]] ?? ''));

        return $value === '' ? null : $value;
    }

    private function csvBool(?string $value): bool
    {
        if ($value === null) {
            return false;
        }

        return in_array(strtolower($value), ['1', 't', 'true', 'yes', 'y'], true);
    }

    private function normalizeEmpresaTamano(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = strtolower(trim($value));
        $allowed = ['solo', 'micro', 'pyme', 'mediana', 'grande'];

        return in_array($value, $allowed, true) ? $value : null;
    }
}
