<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClienteContacto extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'cliente_contactos';

    protected $fillable = [
        'cliente_id',
        'tipo',
        'valor',
        'etiqueta',
        'es_principal',
        'verificado',
    ];

    protected function casts(): array
    {
        return [
            'es_principal' => 'boolean',
            'verificado' => 'boolean',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
}
