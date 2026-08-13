<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Interaccion extends Model
{
    public $timestamps = false;

    protected $table = 'interacciones';

    protected $fillable = [
        'cliente_id',
        'campana_id',
        'canal',
        'direccion',
        'tipo',
        'asunto',
        'detalle',
        'resultado',
        'ocurrio_at',
        'created_by',
        'meta_json',
    ];

    protected function casts(): array
    {
        return [
            'ocurrio_at' => 'datetime',
            'meta_json' => 'array',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function campana(): BelongsTo
    {
        return $this->belongsTo(Campana::class, 'campana_id');
    }

    public function scopeInbound($query)
    {
        return $query->where('direccion', 'inbound');
    }

    public function scopeOutbound($query)
    {
        return $query->where('direccion', 'outbound');
    }
}
