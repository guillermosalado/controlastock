<?php
namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends Controller
{
    // ── Listar usuarios de la tienda ─────────────────────
    public function index(Request $request)
    {
        $usuarios = Usuario::where('id_tienda', $request->user()->id_tienda)
            ->where('id_usuario', '!=', $request->user()->id_usuario) // ← excluir usuario actual
            ->select('id_usuario', 'nombre', 'apellidos', 'email', 'id_rol', 'activo', 'created_at')
            ->orderBy('id_rol')
            ->orderBy('nombre')
            ->get()
            ->map(fn($u) => [
                'id_usuario' => $u->id_usuario,
                'nombre'     => $u->nombre,
                'apellidos'  => $u->apellidos,
                'email'      => $u->email,
                'id_rol'     => $u->id_rol,
                'rol'        => $u->id_rol === 1 ? 'Administrador' : 'Vendedor',
                'activo'     => $u->activo,
            ]);

        return response()->json($usuarios);
    }

    // ── Crear usuario ────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'nombre'    => 'required|string|max:80',
            'apellidos' => 'required|string|max:100',
            'email'     => 'required|email|max:120',
            'password'  => 'required|string|min:6',
            'id_rol'    => 'required|in:1,2',
        ]);

        $existe = Usuario::where('email', $request->email)
            ->where('id_tienda', $request->user()->id_tienda)
            ->exists();

        if ($existe) {
            return response()->json(['error' => 'El correo ya está registrado en esta tienda'], 422);
        }

        $usuario = Usuario::create([
            'id_tienda'     => $request->user()->id_tienda,
            'id_rol'        => $request->id_rol,
            'nombre'        => $request->nombre,
            'apellidos'     => $request->apellidos,
            'email'         => $request->email,
            'password_hash' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Usuario creado correctamente',
            'usuario' => [
                'id_usuario' => $usuario->id_usuario,
                'nombre'     => $usuario->nombre,
                'apellidos'  => $usuario->apellidos,
                'email'      => $usuario->email,
                'id_rol'     => $usuario->id_rol,
                'rol'        => $usuario->id_rol === 1 ? 'Administrador' : 'Vendedor',
                'activo'     => $usuario->activo,
            ]
        ], 201);
    }

    // ── Editar usuario ───────────────────────────────────
    public function update(Request $request, $id)
    {
        $usuario = Usuario::where('id_usuario', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->firstOrFail();

        $request->validate([
            'nombre'    => 'required|string|max:80',
            'apellidos' => 'required|string|max:100',
            'email'     => 'required|email|max:120',
            'id_rol'    => 'required|in:1,2',
        ]);

        $existe = Usuario::where('email', $request->email)
            ->where('id_tienda', $request->user()->id_tienda)
            ->where('id_usuario', '!=', $id)
            ->exists();

        if ($existe) {
            return response()->json(['error' => 'El correo ya está en uso'], 422);
        }

        $usuario->update([
            'nombre'    => $request->nombre,
            'apellidos' => $request->apellidos,
            'email'     => $request->email,
            'id_rol'    => $request->id_rol,
        ]);

        return response()->json(['message' => 'Usuario actualizado correctamente']);
    }

    // ── Activar / desactivar ─────────────────────────────
    public function toggleActivo(Request $request, $id)
    {
        $usuarioAuth = $request->user();

        if ($usuarioAuth->id_usuario == $id) {
            return response()->json(['error' => 'No puedes desactivarte a ti mismo'], 422);
        }

        $usuario = Usuario::where('id_usuario', $id)
            ->where('id_tienda', $usuarioAuth->id_tienda)
            ->firstOrFail();

        $usuario->update(['activo' => !$usuario->activo]);

        return response()->json([
            'message' => $usuario->activo ? 'Usuario activado' : 'Usuario desactivado',
            'activo'  => $usuario->activo,
        ]);
    }

    // ── Cambiar contraseña ───────────────────────────────
    public function cambiarPassword(Request $request, $id)
    {
        $usuario = Usuario::where('id_usuario', $id)
            ->where('id_tienda', $request->user()->id_tienda)
            ->firstOrFail();

        $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $usuario->update([
            'password_hash' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Contraseña actualizada correctamente']);
    }

    public function destroy(Request $request, $id)
    {
        $usuarioAuth = $request->user();

        if ($usuarioAuth->id_usuario == $id) {
            return response()->json(['error' => 'No puedes eliminarte a ti mismo'], 422);
        }

        $usuario = Usuario::where('id_usuario', $id)
            ->where('id_tienda', $usuarioAuth->id_tienda)
            ->firstOrFail();

        $usuario->delete();

        return response()->json([
            'message' => 'Usuario eliminado correctamente'
        ]);
    }
}