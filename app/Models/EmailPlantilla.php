<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailPlantilla extends Model
{
    protected $table = 'email_plantillas';

    protected $fillable = [
        'codigo',
        'nombre',
        'asunto_default',
        'html',
        'descripcion',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function campanas(): HasMany
    {
        return $this->hasMany(Campana::class, 'plantilla_id');
    }

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
