<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tienda extends Model
{
    protected $table = 'tiendas';
    protected $primaryKey = 'id_tienda';

    protected $fillable = [
        'nombre',
        'slug',
        'telefono',
        'email',
        'direccion',
        'activo',
    ];

    public function usuarios()
    {
        return $this->hasMany(Usuario::class, 'id_tienda');
    }
}