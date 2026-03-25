<?php
namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class VentaController extends Controller
{
    // -------------------------------------------------------
    // GET /ventas
    // Historial paginado con filtros opcionales
    // -------------------------------------------------------
    public function index(Request $request)
    {
        $idTienda = $request->user()->id_tienda;

        $query = Venta::where('id_tienda', $idTienda)
            ->with(['usuario:id_usuario,nombre,apellidos'])
            ->select([
                'id_venta', 'folio', 'fecha', 'subtotal',
                'total', 'metodo_pago', 'estado',
                'id_usuario', 'created_at',
            ])
            ->orderByDesc('fecha');

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('fecha', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('fecha', '<=', $request->fecha_hasta);
        }

        if ($request->filled('folio')) {
            $query->where('folio', 'like', '%' . $request->folio . '%');
        }

        $ventas = $query->paginate(15);

        return response()->json(['ok' => true, 'data' => $ventas]);
    }

    // -------------------------------------------------------
    // GET /ventas/{id}
    // Detalle completo con líneas de producto
    // -------------------------------------------------------
    public function show(Request $request, $id)
    {
        $idTienda = $request->user()->id_tienda;

        $venta = Venta::where('id_tienda', $idTienda)
            ->where('id_venta', $id)
            ->with([
                'usuario:id_usuario,nombre,apellidos',
                'detalles.producto:id_producto,nombre,codigo_barras,unidad_medida',
            ])
            ->first();

        if (!$venta) {
            return response()->json([
                'ok'      => false,
                'message' => 'Venta no encontrada',
            ], 404);
        }

        return response()->json(['ok' => true, 'data' => $venta]);
    }

    // -------------------------------------------------------
    // POST /ventas
    // Registrar venta via stored procedure
    // -------------------------------------------------------
    public function store(Request $request)
    {
        $usuario  = $request->user();
        $idTienda = $usuario->id_tienda;

        $v = Validator::make($request->all(), [
            'metodo_pago'             => 'required|in:efectivo,tarjeta,transferencia',
            'items'                   => 'required|array|min:1',
            'items.*.id_producto'     => 'required|integer',
            'items.*.cantidad'        => 'required|integer|min:1',
            'items.*.precio_unitario' => 'required|numeric|min:0.01',
            'observaciones'           => 'nullable|string|max:500',
        ]);

        if ($v->fails()) {
            return response()->json([
                'ok'     => false,
                'errors' => $v->errors(),
            ], 422);
        }

        // Verificar productos y stock antes de llamar al SP
        $idsProductos = collect($request->items)->pluck('id_producto');

        $productos = Producto::where('id_tienda', $idTienda)
            ->whereIn('id_producto', $idsProductos)
            ->where('activo', 1)
            ->get()
            ->keyBy('id_producto');

        foreach ($request->items as $item) {
            if (!$productos->has($item['id_producto'])) {
                return response()->json([
                    'ok'      => false,
                    'message' => "Producto ID {$item['id_producto']} no encontrado o inactivo",
                ], 422);
            }

            $prod = $productos[$item['id_producto']];

            if ($prod->stock_actual < $item['cantidad']) {
                return response()->json([
                    'ok'      => false,
                    'message' => "Stock insuficiente para \"{$prod->nombre}\". Disponible: {$prod->stock_actual}",
                ], 422);
            }
        }

        // Armar JSON para el SP
        $itemsJson = json_encode(
            collect($request->items)->map(fn($i) => [
                'id_producto' => (int) $i['id_producto'],
                'cantidad'    => (int) $i['cantidad'],
                'precio'      => (float) $i['precio_unitario'],
            ])->values()->all()
        );

        // Llamar al stored procedure
        DB::statement('SET @id_venta = 0, @folio = "", @total = 0, @error = NULL');

        DB::statement(
            'CALL sp_registrar_venta(?, ?, ?, ?, ?, @id_venta, @folio, @total, @error)',
            [
                $idTienda,
                $usuario->id_usuario,
                null,                   // siempre mostrador
                $request->metodo_pago,
                $itemsJson,
            ]
        );

        $resultado = DB::selectOne(
            'SELECT @id_venta as id_venta, @folio as folio, @total as total, @error as error'
        );

        if (!empty($resultado->error)) {
            return response()->json([
                'ok'      => false,
                'message' => $resultado->error,
            ], 422);
        }

        // Guardar observaciones si vienen
        if ($request->filled('observaciones')) {
            Venta::where('id_venta', $resultado->id_venta)
                ->update(['observaciones' => $request->observaciones]);
        }

        // Retornar venta completa
        $venta = Venta::where('id_venta', $resultado->id_venta)
            ->with([
                'usuario:id_usuario,nombre,apellidos',
                'detalles.producto:id_producto,nombre,codigo_barras,unidad_medida',
            ])
            ->first();

        return response()->json([
            'ok'      => true,
            'message' => 'Venta registrada exitosamente',
            'data'    => $venta,
        ], 201);
    }

    // -------------------------------------------------------
    // PATCH /ventas/{id}/cancelar
    // Cancela la venta y revierte stock con bitácora
    // -------------------------------------------------------
    public function cancelar(Request $request, $id)
    {
        $usuario  = $request->user();
        $idTienda = $usuario->id_tienda;

        $venta = Venta::where('id_tienda', $idTienda)
            ->where('id_venta', $id)
            ->with('detalles')
            ->first();

        if (!$venta) {
            return response()->json([
                'ok'      => false,
                'message' => 'Venta no encontrada',
            ], 404);
        }

        if ($venta->estado === 'cancelada') {
            return response()->json([
                'ok'      => false,
                'message' => 'La venta ya está cancelada',
            ], 422);
        }

        DB::transaction(function () use ($venta, $usuario) {
            foreach ($venta->detalles as $detalle) {
                $producto = Producto::where('id_producto', $detalle->id_producto)
                    ->lockForUpdate()
                    ->first();

                $stockAnterior = $producto->stock_actual;
                $stockNuevo    = $stockAnterior + $detalle->cantidad;

                $producto->increment('stock_actual', $detalle->cantidad);

                DB::table('inventario_movimientos')->insert([
                    'id_producto'     => $detalle->id_producto,
                    'id_usuario'      => $usuario->id_usuario,
                    'tipo_movimiento' => 'entrada',
                    'origen'          => 'devolucion',
                    'id_referencia'   => $venta->id_venta,
                    'cantidad'        => $detalle->cantidad,
                    'stock_anterior'  => $stockAnterior,
                    'stock_nuevo'     => $stockNuevo,
                    'observaciones'   => "Cancelación de venta {$venta->folio}",
                    'fecha'           => now(),
                ]);
            }

            $venta->update(['estado' => 'cancelada']);
        });

        return response()->json([
            'ok'      => true,
            'message' => "Venta {$venta->folio} cancelada y stock revertido",
        ]);
    }
}