<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampanaDestinatario extends Model
{
    public $timestamps = false;

    protected $table = 'campana_destinatarios';

    protected $fillable = [
        'campana_id',
        'cliente_id',
        'canal',
        'destino',
        'estado',
        'enviado_at',
        'abierto_at',
        'click_at',
        'error_msg',
        'meta_json',
    ];

    protected function casts(): array
    {
        return [
            'enviado_at' => 'datetime',
            'abierto_at' => 'datetime',
            'click_at' => 'datetime',
            'meta_json' => 'array',
        ];
    }

    public function campana(): BelongsTo
    {
        return $this->belongsTo(Campana::class, 'campana_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function scopeEstado($query, string $estado)
    {
        return $query->where('estado', $estado);
    }
}
