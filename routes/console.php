<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('campaigns:process-pending')->hourly();

Schedule::command('campaigns:dispatch-daily-batch')
    ->dailyAt((string) config('campaigns.daily_auto_at', '09:00'))
    ->timezone((string) config('campaigns.daily_auto_timezone', 'America/Argentina/Buenos_Aires'))
    ->withoutOverlapping();
