<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CategoriaController extends Controller
{
    // ── Listar categorías de la tienda ───────────────────
    public function index(Request $request)
    {
        $categorias = DB::table('categorias')
            ->where('id_tienda', $request->user()->id_tienda)
            ->where('activo', 1)
            ->select('id_categoria', 'nombre', 'descripcion')
            ->orderBy('nombre')
            ->get();

        return response()->json($categorias);
    }

    // ── Crear categoría ──────────────────────────────────
    public function store(Request $request)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $request->validate([
            'nombre'      => 'required|string|max:80',
            'descripcion' => 'nullable|string|max:200',
        ]);

        $existe = DB::table('categorias')
            ->where('id_tienda', $request->user()->id_tienda)
            ->where('nombre', $request->nombre)
            ->exists();

        if ($existe) {
            return response()->json(['error' => 'Ya existe una categoría con ese nombre'], 422);
        }

        $id = DB::table('categorias')->insertGetId([
            'id_tienda'   => $request->user()->id_tienda,
            'nombre'      => $request->nombre,
            'descripcion' => $request->descripcion,
            'activo'      => 1,
            'created_at'  => now(),
        ]);

        return response()->json([
            'message'     => 'Categoría creada correctamente',
            'id_categoria'=> $id,
            'nombre'      => $request->nombre,
            'descripcion' => $request->descripcion,
        ], 201);
    }

    // ── Actualizar categoría ─────────────────────────────
    public function update(Request $request, $id)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $categoria = DB::table('categorias')
            ->where('id_categoria', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->first();

        if (!$categoria) {
            return response()->json(['error' => 'Categoría no encontrada'], 404);
        }

        $request->validate([
            'nombre'      => 'required|string|max:80',
            'descripcion' => 'nullable|string|max:200',
        ]);

        $existe = DB::table('categorias')
            ->where('id_tienda', $request->user()->id_tienda)
            ->where('nombre', $request->nombre)
            ->where('id_categoria', '!=', $id)
            ->exists();

        if ($existe) {
            return response()->json(['error' => 'Ya existe una categoría con ese nombre'], 422);
        }

        DB::table('categorias')->where('id_categoria', $id)->update([
            'nombre'      => $request->nombre,
            'descripcion' => $request->descripcion,
        ]);

        return response()->json(['message' => 'Categoría actualizada correctamente']);
    }

    // ── Eliminar categoría ───────────────────────────────
    public function destroy(Request $request, $id)
    {
        if ($request->user()->id_rol !== 1) {
            return response()->json(['error' => 'Sin permisos'], 403);
        }

        $categoria = DB::table('categorias')
            ->where('id_categoria', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->first();

        if (!$categoria) {
            return response()->json(['error' => 'Categoría no encontrada'], 404);
        }

        $tieneProductos = DB::table('productos')
            ->where('id_categoria', $id)
            ->exists();

        if ($tieneProductos) {
            return response()->json([
                'error' => 'No se puede eliminar, tiene productos asociados. Reasigna los productos primero.'
            ], 422);
        }

        DB::table('categorias')->where('id_categoria', $id)->delete();

        return response()->json(['message' => 'Categoría eliminada correctamente']);
    }
}