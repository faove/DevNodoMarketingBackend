<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatchRow extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'import_batch_rows';

    protected $fillable = [
        'batch_id',
        'cliente_id',
        'origen_tabla',
        'origen_id',
        'payload_json',
        'estado',
        'mensaje',
    ];

    protected function casts(): array
    {
        return [
            'payload_json' => 'array',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class, 'batch_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
}
