<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Datos de la empresa para merge tags de email
    |--------------------------------------------------------------------------
    |
    | Usados por App\Services\EmailTemplateRenderer para resolver los tags
    | {{empresa.nombre}} / {{empresa.email}}. Son constantes de configuración,
    | no vienen de la base de datos.
    |
    */

    'nombre' => env('EMPRESA_NOMBRE', env('MAIL_FROM_NAME', 'DevNodo Marketing')),

    'email' => env('EMPRESA_EMAIL', env('MAIL_FROM_ADDRESS', 'hola@devnodo.com')),

];
