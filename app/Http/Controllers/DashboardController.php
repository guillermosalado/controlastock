<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $idTienda  = $request->user()->id_tienda;
        $idUsuario = $request->user()->id_usuario;
        $esAdmin   = $request->user()->id_rol === 1;
        $hoy       = now()->toDateString();
        $mes       = now()->month;
        $anio      = now()->year;

        $ventasHoy = DB::table('ventas')
            ->where('id_tienda', $idTienda)
            ->where('estado', 'completada')
            ->whereDate('fecha', $hoy)
            ->when(!$esAdmin, fn($q) => $q->where('id_usuario', $idUsuario))
            ->selectRaw('COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad')
            ->first();

        $ventasAyer = DB::table('ventas')
            ->where('id_tienda', $idTienda)
            ->where('estado', 'completada')
            ->whereDate('fecha', now()->subDay()->toDateString())
            ->when(!$esAdmin, fn($q) => $q->where('id_usuario', $idUsuario))
            ->selectRaw('COALESCE(SUM(total), 0) as total')
            ->first();

        $variacionHoy = $ventasAyer->total > 0
            ? round((($ventasHoy->total - $ventasAyer->total) / $ventasAyer->total) * 100, 1)
            : 0;

        $ventasMes = DB::table('ventas')
            ->where('id_tienda', $idTienda)
            ->where('estado', 'completada')
            ->whereMonth('fecha', $mes)
            ->whereYear('fecha', $anio)
            ->when(!$esAdmin, fn($q) => $q->where('id_usuario', $idUsuario))
            ->selectRaw('COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad')
            ->first();

        $ventasMesAnterior = DB::table('ventas')
            ->where('id_tienda', $idTienda)
            ->where('estado', 'completada')
            ->whereMonth('fecha', now()->subMonth()->month)
            ->whereYear('fecha', now()->subMonth()->year)
            ->when(!$esAdmin, fn($q) => $q->where('id_usuario', $idUsuario))
            ->selectRaw('COALESCE(SUM(total), 0) as total')
            ->first();

        $variacionMes = $ventasMesAnterior->total > 0
            ? round((($ventasMes->total - $ventasMesAnterior->total) / $ventasMesAnterior->total) * 100, 1)
            : 0;

        $totalProductos = DB::table('productos')
            ->where('id_tienda', $idTienda)->where('activo', 1)->count();

        $bajoStock = DB::table('productos')
            ->where('id_tienda', $idTienda)->where('activo', 1)
            ->whereColumn('stock_actual', '<=', 'stock_minimo')->count();

        $stockBajo = DB::table('productos as p')
            ->join('categorias as c', 'c.id_categoria', '=', 'p.id_categoria')
            ->where('p.id_tienda', $idTienda)->where('p.activo', 1)
            ->whereColumn('p.stock_actual', '<=', 'p.stock_minimo')
            ->select('p.nombre', 'p.stock_actual', 'p.stock_minimo')
            ->orderBy('p.stock_actual', 'asc')->limit(5)->get()
            ->map(function ($p) {
                $porcentaje = $p->stock_minimo > 0
                    ? round(($p->stock_actual / $p->stock_minimo) * 100) : 0;
                $nivel = $porcentaje <= 25 ? 'critico'
                       : ($porcentaje <= 60 ? 'bajo' : 'medio');
                return [
                    'nombre'       => $p->nombre,
                    'stock_actual' => $p->stock_actual,
                    'stock_minimo' => $p->stock_minimo,
                    'porcentaje'   => min($porcentaje, 100),
                    'nivel'        => $nivel,
                ];
            });

        $actividad = DB::table('inventario_movimientos as im')
            ->join('productos as p', 'p.id_producto', '=', 'im.id_producto')
            ->join('usuarios as u',  'u.id_usuario',  '=', 'im.id_usuario')
            ->where('p.id_tienda', $idTienda)
            ->when(!$esAdmin, fn($q) => $q->where('im.id_usuario', $idUsuario)
                                          ->where('im.origen', 'venta'))
            ->select('im.tipo_movimiento', 'im.origen', 'im.cantidad',
                     'im.fecha', 'p.nombre as producto', 'u.nombre as usuario')
            ->orderBy('im.fecha', 'desc')->limit(5)->get()
            ->map(function ($m) {
                return [
                    'tipo'     => $m->tipo_movimiento,
                    'origen'   => $m->origen,
                    'cantidad' => abs($m->cantidad),
                    'producto' => $m->producto,
                    'usuario'  => $m->usuario,
                    'fecha'    => $m->fecha,
                    'hace'     => $this->tiempoRelativo($m->fecha),
                ];
            });

        $ventasRecientes = DB::table('ventas as v')
            ->leftJoin('clientes as cl', 'cl.id_cliente', '=', 'v.id_cliente')
            ->join('usuarios as u', 'u.id_usuario', '=', 'v.id_usuario')
            ->where('v.id_tienda', $idTienda)
            ->where('v.estado', 'completada')
            ->when(!$esAdmin, fn($q) => $q->where('v.id_usuario', $idUsuario))
            ->select('v.folio', 'v.total', 'v.fecha', 'u.nombre as vendedor',
                     DB::raw("COALESCE(CONCAT(cl.nombre,' ',cl.apellidos),'Mostrador') as cliente"))
            ->orderBy('v.fecha', 'desc')->limit(5)->get()
            ->map(function ($v) {
                return [
                    'folio'    => $v->folio,
                    'total'    => number_format($v->total, 2),
                    'cliente'  => $v->cliente,
                    'vendedor' => $v->vendedor,
                    'hace'     => $this->tiempoRelativo($v->fecha),
                ];
            });

        return response()->json([
            'ventas_hoy' => [
                'total'     => number_format($ventasHoy->total, 2),
                'cantidad'  => $ventasHoy->cantidad,
                'variacion' => ($variacionHoy >= 0 ? '+' : '') . $variacionHoy . '%',
            ],
            'ventas_mes' => [
                'total'     => number_format($ventasMes->total, 2),
                'cantidad'  => $ventasMes->cantidad,
                'variacion' => ($variacionMes >= 0 ? '+' : '') . $variacionMes . '%',
            ],
            'inventario' => [
                'total_productos' => $totalProductos,
                'bajo_stock'      => $bajoStock,
            ],
            'empleados' => $esAdmin ? [
                'activos'   => DB::table('usuarios')->where('id_tienda', $idTienda)->where('activo', 1)->count(),
                'inactivos' => DB::table('usuarios')->where('id_tienda', $idTienda)->where('activo', 0)->count(),
            ] : null,
            'stock_bajo'       => $stockBajo,
            'actividad'        => $actividad,
            'ventas_recientes' => $ventasRecientes,
        ]);
    }

    private function tiempoRelativo($fecha)
    {
        $diff = now()->diffInSeconds($fecha);
        if ($diff < 60)    return 'Hace un momento';
        if ($diff < 3600)  return 'Hace ' . round($diff / 60) . ' min';
        if ($diff < 86400) return 'Hace ' . round($diff / 3600) . ' h';
        return 'Hace ' . round($diff / 86400) . ' días';
    }
}