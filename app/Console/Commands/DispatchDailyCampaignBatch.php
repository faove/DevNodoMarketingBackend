<?php

namespace App\Console\Commands;

use App\Services\CampaignDailyBatchService;
use Illuminate\Console\Command;
use Throwable;

class DispatchDailyCampaignBatch extends Command
{
    protected $signature = 'campaigns:dispatch-daily-batch
                            {--dry-run : Resolve audience without creating/sending}
                            {--force : Bypass once-per-day lock}';

    protected $description = 'Import/select up to the daily limit of unsent clients, create a campaign, and queue sends';

    public function handle(CampaignDailyBatchService $service): int
    {
        try {
            $result = $service->dispatch(
                dryRun: (bool) $this->option('dry-run'),
                force: (bool) $this->option('force'),
            );
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info(($result['status'] ?? 'ok').': '.($result['message'] ?? ''));
        foreach ($result as $key => $value) {
            if (in_array($key, ['status', 'message'], true)) {
                continue;
            }
            $this->line("  {$key}=".json_encode($value));
        }

        return in_array($result['status'] ?? '', ['empty', 'disabled'], true)
            ? self::FAILURE
            : self::SUCCESS;
    }
}
