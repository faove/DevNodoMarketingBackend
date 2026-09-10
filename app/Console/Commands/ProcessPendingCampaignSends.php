<?php

namespace App\Console\Commands;

use App\Jobs\ProcessCampaignSendBatch;
use App\Models\Campana;
use App\Services\CampaignSendLimiter;
use Illuminate\Console\Command;

class ProcessPendingCampaignSends extends Command
{
    protected $signature = 'campaigns:process-pending';

    protected $description = 'Continue active campaign sends within the daily email limit';

    public function handle(CampaignSendLimiter $limiter): int
    {
        if ($limiter->remainingToday() <= 0) {
            $this->info('Daily send limit reached; nothing to dispatch.');

            return self::SUCCESS;
        }

        $campanas = Campana::query()
            ->where('canal', 'email')
            ->whereIn('estado', ['activa', 'programada'])
            ->whereHas('destinatarios', fn ($q) => $q->where('estado', 'pendiente'))
            ->orderBy('id')
            ->get(['id', 'codigo', 'nombre', 'estado']);

        foreach ($campanas as $campana) {
            ProcessCampaignSendBatch::dispatch($campana->id);
            $this->line("Dispatched batch for campaign #{$campana->id} ({$campana->codigo})");
        }

        if ($campanas->isEmpty()) {
            $this->info('No active campaigns with pending recipients.');
        }

        return self::SUCCESS;
    }
}
