<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    protected $table      = 'ventas';
    protected $primaryKey = 'id_venta';
    public    $timestamps = false;

    protected $fillable = [
        'id_tienda', 'id_usuario', 'id_cliente',
        'folio', 'fecha', 'subtotal', 'descuento',
        'total', 'metodo_pago', 'estado', 'observaciones',
    ];

    protected $casts = [
        'subtotal'   => 'decimal:2',
        'descuento'  => 'decimal:2',
        'total'      => 'decimal:2',
        'id_venta'   => 'integer',
        'id_tienda'  => 'integer',
        'id_usuario' => 'integer',
        'id_cliente' => 'integer',
    ];

    public function tienda()
    {
        return $this->belongsTo(Tienda::class, 'id_tienda');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'id_usuario');
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'id_cliente');
    }

    public function detalles()
    {
        return $this->hasMany(DetalleVenta::class, 'id_venta');
    }
}