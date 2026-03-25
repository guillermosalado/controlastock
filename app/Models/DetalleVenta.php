<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleVenta extends Model
{
    protected $table      = 'detalle_ventas';
    protected $primaryKey = 'id_detalle';
    public $timestamps    = false;

    protected $fillable = [
        'id_venta', 'id_producto', 'cantidad',
        'precio_unitario', 'descuento', 'subtotal',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'id_producto', 'id_producto');
    }
}