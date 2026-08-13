<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    public $timestamps = false;

    protected $table = 'productos';

    protected $fillable = [
        'codigo',
        'nombre',
        'categoria',
        'descripcion',
        'url',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function intereses(): HasMany
    {
        return $this->hasMany(ClienteInteres::class, 'producto_id');
    }

    public function clientes(): BelongsToMany
    {
        return $this->belongsToMany(Cliente::class, 'cliente_intereses', 'producto_id', 'cliente_id')
            ->withPivot(['id', 'prioridad', 'notas', 'created_at']);
    }

    public function campanas(): HasMany
    {
        return $this->hasMany(Campana::class, 'producto_id');
    }

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
