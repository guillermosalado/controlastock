<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    // -------------------------------------------------------
    // GET /api/reportes/resumen-dia
    // Ventas del día: total, transacciones, canceladas
    // -------------------------------------------------------
    public function resumenDia(Request $request)
    {
        $idTienda = $request->user()->id_tienda;
        $fecha    = $request->input('fecha', now()->toDateString());

        $resumen = DB::selectOne("
            SELECT
                COUNT(*)                                        AS total_transacciones,
                SUM(CASE WHEN estado='completada' THEN 1 ELSE 0 END) AS ventas_completadas,
                SUM(CASE WHEN estado='cancelada'  THEN 1 ELSE 0 END) AS ventas_canceladas,
                COALESCE(SUM(CASE WHEN estado='completada' THEN total ELSE 0 END), 0) AS ingresos_totales,
                COALESCE(SUM(CASE WHEN estado='completada' THEN descuento ELSE 0 END), 0) AS descuentos_otorgados
            FROM ventas
            WHERE id_tienda = ?
              AND DATE(fecha) = ?
        ", [$idTienda, $fecha]);

        // Venta más alta del día
        $ventaTop = DB::selectOne("
            SELECT folio, total, metodo_pago
            FROM ventas
            WHERE id_tienda = ?
              AND DATE(fecha) = ?
              AND estado = 'completada'
            ORDER BY total DESC
            LIMIT 1
        ", [$idTienda, $fecha]);

        // Desglose por método de pago
        $metodos = DB::select("
            SELECT metodo_pago,
                   COUNT(*) AS cantidad,
                   SUM(total) AS total
            FROM ventas
            WHERE id_tienda = ?
              AND DATE(fecha) = ?
              AND estado = 'completada'
            GROUP BY metodo_pago
        ", [$idTienda, $fecha]);

        return response()->json([
            'ok'   => true,
            'data' => [
                'resumen'   => $resumen,
                'venta_top' => $ventaTop,
                'metodos'   => $metodos,
                'fecha'     => $fecha,
            ],
        ]);
    }

    // -------------------------------------------------------
    // GET /api/reportes/productos-mas-vendidos
    // Usa la vista vw_productos_mas_vendidos
    // Parámetros opcionales: limit, fecha_desde, fecha_hasta
    // -------------------------------------------------------
    public function productosMasVendidos(Request $request)
    {
        $idTienda   = $request->user()->id_tienda;
        $limit      = (int) $request->input('limit', 10);
        $fechaDesde = $request->input('fecha_desde');
        $fechaHasta = $request->input('fecha_hasta');

        // Si hay filtro de fechas, consultamos directo a las tablas
        if ($fechaDesde || $fechaHasta) {
            $sql = "
                SELECT
                    p.id_producto,
                    p.nombre        AS producto,
                    c.nombre        AS categoria,
                    SUM(dv.cantidad)            AS unidades_vendidas,
                    SUM(dv.subtotal)            AS ingresos_generados,
                    COUNT(DISTINCT dv.id_venta) AS num_ventas
                FROM detalle_ventas dv
                JOIN ventas     v ON v.id_venta     = dv.id_venta
                                 AND v.id_tienda    = ?
                                 AND v.estado       = 'completada'
                JOIN productos  p ON p.id_producto  = dv.id_producto
                JOIN categorias c ON c.id_categoria = p.id_categoria
                WHERE 1=1
            ";
            $params = [$idTienda];

            if ($fechaDesde) { $sql .= " AND DATE(v.fecha) >= ?"; $params[] = $fechaDesde; }
            if ($fechaHasta) { $sql .= " AND DATE(v.fecha) <= ?"; $params[] = $fechaHasta; }

            $sql .= " GROUP BY p.id_producto, p.nombre, c.nombre
                      ORDER BY unidades_vendidas DESC
                      LIMIT ?";
            $params[] = $limit;

            $productos = DB::select($sql, $params);
        } else {
            $productos = DB::select("
                SELECT id_producto, producto, categoria,
                       unidades_vendidas, ingresos_generados, num_ventas
                FROM vw_productos_mas_vendidos
                WHERE id_tienda = ?
                ORDER BY unidades_vendidas DESC
                LIMIT ?
            ", [$idTienda, $limit]);
        }

        return response()->json(['ok' => true, 'data' => $productos]);
    }

    // -------------------------------------------------------
    // GET /api/reportes/stock-bajo
    // Productos con stock <= stock_minimo
    // -------------------------------------------------------
    public function stockBajo(Request $request)
    {
        $idTienda = $request->user()->id_tienda;

        $productos = DB::select("
            SELECT id_producto, codigo_barras, producto,
                   categoria, stock_actual, stock_minimo,
                   precio_venta, proveedor
            FROM vw_stock_bajo
            WHERE id_tienda = ?
            ORDER BY stock_actual ASC
        ", [$idTienda]);

        return response()->json(['ok' => true, 'data' => $productos]);
    }
}