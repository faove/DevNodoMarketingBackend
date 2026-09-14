<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Daily outbound email cap (all campaigns)
    |--------------------------------------------------------------------------
    */
    'daily_send_limit' => (int) env('CAMPAIGN_DAILY_SEND_LIMIT', 50),

    /*
    |--------------------------------------------------------------------------
    | Recipients processed per queue job run
    |--------------------------------------------------------------------------
    */
    'batch_size' => (int) env('CAMPAIGN_SEND_BATCH_SIZE', 10),

    /*
    |--------------------------------------------------------------------------
    | Audit / registry recipient after each daily wave of sends
    |--------------------------------------------------------------------------
    */
    'registry_email' => env('CAMPAIGN_REGISTRY_EMAIL', 'faovenezuela@gmail.com'),
    'registry_send_html_copy' => filter_var(env('CAMPAIGN_REGISTRY_SEND_HTML_COPY', true), FILTER_VALIDATE_BOOLEAN),
    'bcc_registry_on_each' => filter_var(env('CAMPAIGN_BCC_REGISTRY_ON_EACH', true), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Automatic daily outreach batch
    |--------------------------------------------------------------------------
    */
    'daily_auto_enabled' => filter_var(env('CAMPAIGN_DAILY_AUTO_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
    'daily_auto_timezone' => env('CAMPAIGN_DAILY_AUTO_TIMEZONE', 'America/Argentina/Buenos_Aires'),
    'daily_auto_at' => env('CAMPAIGN_DAILY_AUTO_AT', '09:00'),
    'daily_auto_plantilla' => env('CAMPAIGN_DAILY_AUTO_PLANTILLA', 'automatizacion-procesos'),
    'daily_auto_ignore_opt_in' => filter_var(env('CAMPAIGN_DAILY_AUTO_IGNORE_OPT_IN', true), FILTER_VALIDATE_BOOLEAN),
    'daily_auto_csv' => env('CAMPAIGN_DAILY_AUTO_CSV'),

];
