<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProveedorController extends Controller
{
    public function index(Request $request)
    {
        $proveedores = DB::table('proveedores')
            ->where('id_tienda', $request->user()->id_tienda)
            ->orderBy('empresa')
            ->get()
            ->map(fn($p) => [
                'id_proveedor' => $p->id_proveedor,
                'empresa'      => $p->empresa,
                'contacto'     => $p->contacto,
                'telefono'     => $p->telefono,
                'email'        => $p->email,
                'direccion'    => $p->direccion,
                'activo'       => $p->activo,
            ]);

        return response()->json($proveedores);
    }

    public function store(Request $request)
    {
        $request->validate([
            'empresa'   => 'required|string|max:120',
            'contacto'  => 'nullable|string|max:120',
            'telefono'  => 'nullable|string|max:20',
            'email'     => 'nullable|email|max:120',
            'direccion' => 'nullable|string|max:255',
        ]);

        $id = DB::table('proveedores')->insertGetId([
            'id_tienda'  => $request->user()->id_tienda,
            'empresa'    => $request->empresa,
            'contacto'   => $request->contacto,
            'telefono'   => $request->telefono,
            'email'      => $request->email,
            'direccion'  => $request->direccion,
            'activo'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $proveedor = DB::table('proveedores')->where('id_proveedor', $id)->first();

        return response()->json([
            'message'    => 'Proveedor creado correctamente',
            'proveedor'  => $proveedor,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'empresa'   => 'required|string|max:120',
            'contacto'  => 'nullable|string|max:120',
            'telefono'  => 'nullable|string|max:20',
            'email'     => 'nullable|email|max:120',
            'direccion' => 'nullable|string|max:255',
        ]);

        $existe = DB::table('proveedores')
            ->where('id_proveedor', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->exists();

        if (!$existe) {
            return response()->json(['error' => 'Proveedor no encontrado'], 404);
        }

        DB::table('proveedores')
            ->where('id_proveedor', $id)
            ->update([
                'empresa'    => $request->empresa,
                'contacto'   => $request->contacto,
                'telefono'   => $request->telefono,
                'email'      => $request->email,
                'direccion'  => $request->direccion,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Proveedor actualizado correctamente']);
    }

    public function destroy(Request $request, $id)
    {
        $proveedor = DB::table('proveedores')
            ->where('id_proveedor', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->first();

        if (!$proveedor) {
            return response()->json(['error' => 'Proveedor no encontrado'], 404);
        }

        $tieneProductos = DB::table('productos')
            ->where('id_proveedor', $id)
            ->where('activo', 1)
            ->exists();

        if ($tieneProductos) {
            return response()->json([
                'error' => 'No se puede eliminar, tiene productos activos asociados'
            ], 422);
        }

        DB::table('proveedores')->where('id_proveedor', $id)->delete();

        return response()->json(['message' => 'Proveedor eliminado correctamente']);
    }
}