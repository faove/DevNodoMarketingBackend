<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImportBatch extends Model
{
    public $timestamps = false;

    protected $table = 'import_batches';

    protected $fillable = [
        'fuente',
        'archivo',
        'total_filas',
        'insertadas',
        'actualizadas',
        'omitidas',
        'errores',
        'notas',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'total_filas' => 'integer',
            'insertadas' => 'integer',
            'actualizadas' => 'integer',
            'omitidas' => 'integer',
            'errores' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function rows(): HasMany
    {
        return $this->hasMany(ImportBatchRow::class, 'batch_id');
    }
}
