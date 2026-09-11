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

];
