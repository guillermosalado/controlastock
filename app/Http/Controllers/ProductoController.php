<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductoController extends Controller
{
    public function index(Request $request)
    {
        $usuario  = $request->user();
        $esAdmin  = $usuario->id_rol === 1;

        $productos = DB::table('productos as p')
            ->join('categorias as c', 'c.id_categoria', '=', 'p.id_categoria')
            ->leftJoin('proveedores as pr', 'pr.id_proveedor', '=', 'p.id_proveedor')
            ->where('p.id_tienda', $usuario->id_tienda)
            ->select(
                'p.id_producto',
                'p.nombre',
                'p.codigo_barras',
                'p.descripcion',
                'p.precio_venta',
                'p.stock_actual',
                'p.stock_minimo',
                'p.unidad_medida',
                'p.activo',
                'p.id_categoria',
                'p.id_proveedor',
                'c.nombre as categoria',
                'pr.empresa as proveedor',
                DB::raw($esAdmin ? 'p.precio_compra' : '0 as precio_compra')
            )
            ->orderBy('p.nombre')
            ->get();

        return response()->json($productos);
    }

    public function store(Request $request)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $request->validate([
            'nombre'        => 'required|string|max:120',
            'id_categoria'  => 'required|integer',
            'precio_venta'  => 'required|numeric|min:0',
            'precio_compra' => 'nullable|numeric|min:0',
            'stock_actual'  => 'nullable|integer|min:0',
            'stock_minimo'  => 'nullable|integer|min:0',
            'unidad_medida' => 'nullable|string|max:30',
            'codigo_barras' => 'nullable|string|max:50',
            'id_proveedor'  => 'nullable|integer',
            'descripcion'   => 'nullable|string',
        ]);

        $id = DB::table('productos')->insertGetId([
            'id_tienda'     => $request->user()->id_tienda,
            'id_categoria'  => $request->id_categoria,
            'id_proveedor'  => $request->id_proveedor,
            'codigo_barras' => $request->codigo_barras,
            'nombre'        => $request->nombre,
            'descripcion'   => $request->descripcion,
            'precio_compra' => $request->precio_compra ?? 0,
            'precio_venta'  => $request->precio_venta,
            'stock_actual'  => $request->stock_actual ?? 0,
            'stock_minimo'  => $request->stock_minimo ?? 5,
            'unidad_medida' => $request->unidad_medida ?? 'pieza',
            'activo'        => 1,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        // Registrar movimiento inicial si hay stock
        if (($request->stock_actual ?? 0) > 0) {
            DB::table('inventario_movimientos')->insert([
                'id_producto'     => $id,
                'id_usuario'      => $request->user()->id_usuario,
                'tipo_movimiento' => 'entrada',
                'origen'          => 'ajuste_manual',
                'cantidad'        => $request->stock_actual,
                'stock_anterior'  => 0,
                'stock_nuevo'     => $request->stock_actual,
                'observaciones'   => 'Stock inicial al crear producto',
                'fecha'           => now(),
            ]);
        }

        return response()->json([
            'message' => 'Producto creado correctamente',
            'id'      => $id,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $producto = DB::table('productos')
            ->where('id_producto', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->first();

        if (!$producto) {
            return response()->json(['error' => 'Producto no encontrado'], 404);
        }

        $request->validate([
            'nombre'        => 'required|string|max:120',
            'id_categoria'  => 'required|integer',
            'precio_venta'  => 'required|numeric|min:0',
            'precio_compra' => 'nullable|numeric|min:0',
            'stock_minimo'  => 'nullable|integer|min:0',
            'unidad_medida' => 'nullable|string|max:30',
            'codigo_barras' => 'nullable|string|max:50',
            'id_proveedor'  => 'nullable|integer',
            'descripcion'   => 'nullable|string',
        ]);

        DB::table('productos')->where('id_producto', $id)->update([
            'id_categoria'  => $request->id_categoria,
            'id_proveedor'  => $request->id_proveedor,
            'codigo_barras' => $request->codigo_barras,
            'nombre'        => $request->nombre,
            'descripcion'   => $request->descripcion,
            'precio_compra' => $request->precio_compra ?? 0,
            'precio_venta'  => $request->precio_venta,
            'stock_minimo'  => $request->stock_minimo ?? 5,
            'unidad_medida' => $request->unidad_medida ?? 'pieza',
            'updated_at'    => now(),
        ]);

        return response()->json(['message' => 'Producto actualizado correctamente']);
    }

    public function toggleActivo(Request $request, $id)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $producto = DB::table('productos')
            ->where('id_producto', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->first();

        if (!$producto) {
            return response()->json(['error' => 'Producto no encontrado'], 404);
        }

        $nuevoEstado = !$producto->activo;
        DB::table('productos')->where('id_producto', $id)
            ->update(['activo' => $nuevoEstado, 'updated_at' => now()]);

        return response()->json([
            'message' => $nuevoEstado ? 'Producto activado' : 'Producto desactivado',
            'activo'  => $nuevoEstado,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $producto = DB::table('productos')
            ->where('id_producto', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->first();

        if (!$producto) {
            return response()->json(['error' => 'Producto no encontrado'], 404);
        }

        $tieneVentas = DB::table('detalle_ventas')->where('id_producto', $id)->exists();
        $tieneCompras = DB::table('detalle_compras')->where('id_producto', $id)->exists();

        if ($tieneVentas || $tieneCompras) {
            return response()->json([
                'error' => 'No se puede eliminar, tiene ventas o compras asociadas. Puedes desactivarlo en su lugar.'
            ], 422);
        }

        DB::table('inventario_movimientos')->where('id_producto', $id)->delete();
        DB::table('productos')->where('id_producto', $id)->delete();

        return response()->json(['message' => 'Producto eliminado correctamente']);
    }

    public function ajusteStock(Request $request, $id)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $request->validate([
            'cantidad'      => 'required|integer',
            'tipo'          => 'required|in:entrada,salida,ajuste',
            'observaciones' => 'nullable|string|max:255',
        ]);

        $producto = DB::table('productos')
            ->where('id_producto', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->first();

        if (!$producto) {
            return response()->json(['error' => 'Producto no encontrado'], 404);
        }

        $stockAnterior = $producto->stock_actual;
        $cantidad      = $request->tipo === 'salida'
            ? -abs($request->cantidad)
            : abs($request->cantidad);
        $stockNuevo    = $stockAnterior + $cantidad;

        if ($stockNuevo < 0) {
            return response()->json(['error' => 'Stock insuficiente para esta salida'], 422);
        }

        DB::table('productos')->where('id_producto', $id)
            ->update(['stock_actual' => $stockNuevo, 'updated_at' => now()]);

        DB::table('inventario_movimientos')->insert([
            'id_producto'     => $id,
            'id_usuario'      => $request->user()->id_usuario,
            'tipo_movimiento' => $request->tipo,
            'origen'          => 'ajuste_manual',
            'cantidad'        => $cantidad,
            'stock_anterior'  => $stockAnterior,
            'stock_nuevo'     => $stockNuevo,
            'observaciones'   => $request->observaciones,
            'fecha'           => now(),
        ]);

        return response()->json([
            'message'     => 'Ajuste realizado correctamente',
            'stock_nuevo' => $stockNuevo,
        ]);
    }
}