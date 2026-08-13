<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cliente extends Model
{
    use SoftDeletes;

    protected $table = 'clientes';

    protected $fillable = [
        'uuid',
        'tipo',
        'razon_social',
        'nombre',
        'apellido',
        'nombre_fantasia',
        'documento_tipo',
        'documento_nro',
        'cuit_cuil',
        'email_principal',
        'telefono_principal',
        'whatsapp',
        'sitio_web',
        'sector',
        'rubro',
        'empresa_tamano',
        'ciudad',
        'provincia',
        'pais',
        'codigo_postal',
        'direccion',
        'latitud',
        'longitud',
        'fuente',
        'fuente_detalle',
        'origen_tabla',
        'origen_id',
        'score',
        'estado',
        'opt_in_email',
        'opt_in_sms',
        'opt_in_whatsapp',
        'opt_in_llamada',
        'opt_out_at',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'uuid' => 'string',
            'latitud' => 'decimal:7',
            'longitud' => 'decimal:7',
            'score' => 'integer',
            'opt_in_email' => 'boolean',
            'opt_in_sms' => 'boolean',
            'opt_in_whatsapp' => 'boolean',
            'opt_in_llamada' => 'boolean',
            'opt_out_at' => 'datetime',
        ];
    }

    public function contactos(): HasMany
    {
        return $this->hasMany(ClienteContacto::class, 'cliente_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'cliente_tags', 'cliente_id', 'tag_id')
            ->withPivot('created_at');
    }

    public function intereses(): HasMany
    {
        return $this->hasMany(ClienteInteres::class, 'cliente_id');
    }

    public function productos(): BelongsToMany
    {
        return $this->belongsToMany(Producto::class, 'cliente_intereses', 'cliente_id', 'producto_id')
            ->withPivot(['id', 'prioridad', 'notas', 'created_at']);
    }

    public function campanaDestinatarios(): HasMany
    {
        return $this->hasMany(CampanaDestinatario::class, 'cliente_id');
    }

    public function interacciones(): HasMany
    {
        return $this->hasMany(Interaccion::class, 'cliente_id');
    }

    public function consentimientos(): HasMany
    {
        return $this->hasMany(Consentimiento::class, 'cliente_id');
    }

    public function importBatchRows(): HasMany
    {
        return $this->hasMany(ImportBatchRow::class, 'cliente_id');
    }

    public function scopeWithEmail($query)
    {
        return $query->whereNotNull('email_principal');
    }

    public function scopeOptInEmail($query)
    {
        return $query->where('opt_in_email', true)->whereNull('opt_out_at');
    }

    public function scopeEstado($query, string $estado)
    {
        return $query->where('estado', $estado);
    }
}
