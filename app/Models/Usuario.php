<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'usuarios';
    protected $primaryKey = 'id_usuario';

    protected $fillable = [
        'id_tienda',
        'id_rol',
        'nombre',
        'apellidos',
        'email',
        'password_hash',
        'activo',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'activo'    => 'boolean',
        'id_usuario'=> 'integer',
        'id_tienda' => 'integer',
        'id_rol'    => 'integer',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function tienda()
    {
        return $this->belongsTo(Tienda::class, 'id_tienda');
    }
}