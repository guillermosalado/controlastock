<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $table      = 'productos';
    protected $primaryKey = 'id_producto';
    public $timestamps    = true;

    protected $fillable = [
        'id_tienda', 'id_categoria', 'id_proveedor',
        'codigo_barras', 'nombre', 'descripcion',
        'precio_compra', 'precio_venta',
        'stock_actual', 'stock_minimo',
        'unidad_medida', 'activo',
    ];

    protected $casts = [
        'precio_compra' => 'float',
        'precio_venta'  => 'float',
        'stock_actual'  => 'integer',
        'stock_minimo'  => 'integer',
        'activo'        => 'boolean',
    ];
}