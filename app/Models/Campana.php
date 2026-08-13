<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campana extends Model
{
    protected $table = 'campanas';

    protected $fillable = [
        'codigo',
        'nombre',
        'canal',
        'objetivo',
        'producto_id',
        'estado',
        'asunto',
        'mensaje_preview',
        'plantilla_html',
        'programada_at',
        'iniciada_at',
        'finalizada_at',
    ];

    protected function casts(): array
    {
        return [
            'programada_at' => 'datetime',
            'iniciada_at' => 'datetime',
            'finalizada_at' => 'datetime',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function destinatarios(): HasMany
    {
        return $this->hasMany(CampanaDestinatario::class, 'campana_id');
    }

    public function interacciones(): HasMany
    {
        return $this->hasMany(Interaccion::class, 'campana_id');
    }

    public function scopeCanal($query, string $canal)
    {
        return $query->where('canal', $canal);
    }

    public function scopeEstado($query, string $estado)
    {
        return $query->where('estado', $estado);
    }
}
