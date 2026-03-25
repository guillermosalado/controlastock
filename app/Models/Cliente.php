<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $table      = 'clientes';
    protected $primaryKey = 'id_cliente';

    protected $fillable = [
        'id_tienda', 'nombre', 'apellidos',
        'telefono', 'email', 'direccion', 'activo',
    ];

    protected $casts = [
        'activo'     => 'boolean',
        'id_cliente' => 'integer',
        'id_tienda'  => 'integer',
    ];

    public function tienda()
    {
        return $this->belongsTo(Tienda::class, 'id_tienda');
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class, 'id_cliente');
    }
}