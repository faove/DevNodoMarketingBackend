<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClienteInteres extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'cliente_intereses';

    protected $fillable = [
        'cliente_id',
        'producto_id',
        'prioridad',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'prioridad' => 'integer',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
