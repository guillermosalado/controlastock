<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MovimientoController extends Controller
{
    public function index(Request $request)
    {
        $usuario = $request->user();
        $esAdmin = $usuario->id_rol === 1;

        $query = DB::table('inventario_movimientos as im')
            ->join('productos as p',  'p.id_producto', '=', 'im.id_producto')
            ->join('usuarios as u',   'u.id_usuario',  '=', 'im.id_usuario')
            ->where('p.id_tienda', $usuario->id_tienda)
            ->select(
                'im.id_movimiento',
                'im.tipo_movimiento',
                'im.origen',
                'im.cantidad',
                'im.stock_anterior',
                'im.stock_nuevo',
                'im.observaciones',
                'im.fecha',
                'p.nombre as producto',
                'u.nombre as usuario'
            )
            ->orderBy('im.fecha', 'desc')
            ->limit(100);

        // Vendedor solo ve movimientos de ventas donde él participó
        if (!$esAdmin) {
            $query->where('im.id_usuario', $usuario->id_usuario)
                  ->where('im.origen', 'venta');
        }

        return response()->json($query->get());
    }
}