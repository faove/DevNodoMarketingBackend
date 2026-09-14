<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignSendRegistro extends Model
{
    protected $table = 'campaign_send_registros';

    protected $fillable = [
        'fecha',
        'campana_id',
        'enviados',
        'fallidos',
        'omitidos',
        'tope_diario',
        'restantes_dia',
        'notificado_a',
        'notificado_at',
        'destinatarios_json',
        'meta_json',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'enviados' => 'integer',
            'fallidos' => 'integer',
            'omitidos' => 'integer',
            'tope_diario' => 'integer',
            'restantes_dia' => 'integer',
            'notificado_at' => 'datetime',
            'destinatarios_json' => 'array',
            'meta_json' => 'array',
        ];
    }

    public function campana(): BelongsTo
    {
        return $this->belongsTo(Campana::class, 'campana_id');
    }
}
