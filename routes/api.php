<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UsuarioController;  
use App\Http\Controllers\ProveedorController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\MovimientoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\ReporteController;

Route::post('/registro', [AuthController::class, 'registro']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Usuarios
    Route::get('/usuarios',                        [UsuarioController::class, 'index']);
    Route::post('/usuarios',                       [UsuarioController::class, 'store']);
    Route::put('/usuarios/{id}',                   [UsuarioController::class, 'update']);
    Route::patch('/usuarios/{id}/toggle-activo',   [UsuarioController::class, 'toggleActivo']);
    Route::patch('/usuarios/{id}/password',        [UsuarioController::class, 'cambiarPassword']);
    Route::delete('/usuarios/{id}', [UsuarioController::class, 'destroy']);

    // Proveedores
    Route::get('/proveedores',          [ProveedorController::class, 'index']);
    Route::post('/proveedores',         [ProveedorController::class, 'store']);
    Route::put('/proveedores/{id}',     [ProveedorController::class, 'update']);
    Route::delete('/proveedores/{id}',  [ProveedorController::class, 'destroy']);

    // Productos
    Route::get('/productos',                      [ProductoController::class, 'index']);
    Route::post('/productos',                     [ProductoController::class, 'store']);
    Route::put('/productos/{id}',                 [ProductoController::class, 'update']);
    Route::patch('/productos/{id}/toggle-activo', [ProductoController::class, 'toggleActivo']);
    Route::patch('/productos/{id}/ajuste-stock',  [ProductoController::class, 'ajusteStock']);
    Route::delete('/productos/{id}',              [ProductoController::class, 'destroy']);

    // Movimientos
    Route::get('/movimientos', [MovimientoController::class, 'index']);
    
    // Categorías
    Route::get('/categorias',         [CategoriaController::class, 'index']);
    Route::post('/categorias',        [CategoriaController::class, 'store']);
    Route::put('/categorias/{id}',    [CategoriaController::class, 'update']);
    Route::delete('/categorias/{id}', [CategoriaController::class, 'destroy']);

    // Ventas
    Route::get('/ventas',                   [VentaController::class, 'index']);
    Route::post('/ventas',                  [VentaController::class, 'store']);
    Route::get('/ventas/{id}',              [VentaController::class, 'show']);
    Route::patch('/ventas/{id}/cancelar',   [VentaController::class, 'cancelar']);

    Route::get('/reportes/resumen-dia',            [ReporteController::class, 'resumenDia']);
    Route::get('/reportes/productos-mas-vendidos', [ReporteController::class, 'productosMasVendidos']);
    Route::get('/reportes/stock-bajo',             [ReporteController::class, 'stockBajo']);
});