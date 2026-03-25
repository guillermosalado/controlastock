<?php
namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Models\Tienda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function registro(Request $request)
    {
        $request->validate([
            'tienda_name' => 'required|string|max:120',
            'nombre'      => 'required|string|max:80',
            'apellidos'   => 'required|string|max:100',
            'email'       => 'required|email|max:120',
            'password'    => 'required|string|min:6|confirmed',
        ]);

        // Generar slug único para la tienda
        $slug = Str::slug($request->tienda_name);
        $slugBase = $slug;
        $i = 1;
        while (Tienda::where('slug', $slug)->exists()) {
            $slug = $slugBase . '-' . $i++;
        }

        // Crear tienda
        $tienda = Tienda::create([
            'nombre' => $request->tienda_name,
            'slug'   => $slug,
        ]);

        // Crear usuario administrador
        $usuario = Usuario::create([
            'id_tienda'     => $tienda->id_tienda,
            'id_rol'        => 1,
            'nombre'        => $request->nombre,
            'apellidos'     => $request->apellidos,
            'email'         => $request->email,
            'password_hash' => Hash::make($request->password),
        ]);

        $token = $usuario->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token'   => $token,
            'usuario' => [
                'nombre'    => $usuario->nombre,
                'email'     => $usuario->email,
                'id_rol'    => $usuario->id_rol,
                'id_tienda' => $usuario->id_tienda,
            ],
            'tienda' => [
                'nombre' => $tienda->nombre,
                'slug'   => $tienda->slug,
            ]
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'tienda_nombre' => 'required|string',
            'email'         => 'required|email',
            'password'      => 'required|string',
        ]);

        // Convertir nombre a slug y buscar tienda
        $slug = Str::slug($request->tienda_nombre);
        $tienda = Tienda::where('slug', $slug)->first();

        if (!$tienda) {
            return response()->json(['error' => 'Tienda no encontrada'], 404);
        }

        // Buscar usuario en esa tienda
        $usuario = Usuario::where('email', $request->email)
                          ->where('id_tienda', $tienda->id_tienda)
                          ->where('activo', 1)
                          ->first();

        if (!$usuario || !Hash::check($request->password, $usuario->password_hash)) {
            return response()->json(['error' => 'Credenciales incorrectas'], 401);
        }

        $token = $usuario->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token'   => $token,
            'usuario' => [
                'nombre'    => $usuario->nombre,
                'email'     => $usuario->email,
                'id_rol'    => $usuario->id_rol,
                'id_tienda' => $usuario->id_tienda,
            ],
            'tienda' => [
                'nombre' => $tienda->nombre,
                'slug'   => $tienda->slug,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada']);
    }
}