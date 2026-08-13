<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Consentimiento extends Model
{
    public $timestamps = false;

    protected $table = 'consentimientos';

    protected $fillable = [
        'cliente_id',
        'canal',
        'otorgado',
        'base_legal',
        'evidencia',
        'ip_origen',
        'registrado_at',
    ];

    protected function casts(): array
    {
        return [
            'otorgado' => 'boolean',
            'registrado_at' => 'datetime',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
}
