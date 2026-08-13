<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Segmento extends Model
{
    protected $table = 'segmentos';

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
        'reglas_json',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'reglas_json' => 'array',
            'activo' => 'boolean',
        ];
    }

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
