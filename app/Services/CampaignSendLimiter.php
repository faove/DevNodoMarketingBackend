<?php

namespace App\Services;

use App\Models\CampanaDestinatario;
use Carbon\Carbon;
use Illuminate\Support\Facades\Date;

class CampaignSendLimiter
{
    public function dailyLimit(): int
    {
        return max(0, (int) config('campaigns.daily_send_limit', 50));
    }

    public function batchSize(): int
    {
        return max(1, (int) config('campaigns.batch_size', 10));
    }

    public function timezone(): string
    {
        return (string) config('app.timezone', 'UTC');
    }

    public function todayStart(): Carbon
    {
        return Date::now($this->timezone())->startOfDay()->utc();
    }

    public function sentToday(): int
    {
        return CampanaDestinatario::query()
            ->whereNotNull('enviado_at')
            ->where('enviado_at', '>=', $this->todayStart())
            ->whereIn('estado', ['enviado', 'entregado', 'abierto', 'click', 'respondido'])
            ->count();
    }

    public function remainingToday(): int
    {
        return max(0, $this->dailyLimit() - $this->sentToday());
    }
}
