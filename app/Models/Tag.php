<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'tags';

    protected $fillable = [
        'codigo',
        'nombre',
        'color',
        'descripcion',
    ];

    public function clientes(): BelongsToMany
    {
        return $this->belongsToMany(Cliente::class, 'cliente_tags', 'tag_id', 'cliente_id')
            ->withPivot('created_at');
    }
}
