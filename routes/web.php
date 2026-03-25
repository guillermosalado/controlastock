<?php

use Illuminate\Support\Facades\Route;

// Rutas publicas
Route::get('/', function () {
    return response()->file(public_path('views/public/index.html'));
});
Route::get('/funciones', function () {
    return response()->file(public_path('views/public/funciones.html'));
});
Route::get('/contacto', function () {
    return response()->file(public_path('views/public/contacto.html'));
});

// Rutas Auth
Route::get('/login', function () {
    return response()->file(public_path('views/auth/login.html'));
});
Route::get('/registrate', function () {
    return response()->file(public_path('views/auth/login.html'));
});

// Catch-all Admin — sirve el shell, el router.js maneja el resto
Route::get('/admin/{any?}', function () {
    return response()->file(public_path('views/admin/dashboard.html'));
})->where('any', '.*');

// Catch-all Vendedor
Route::get('/vendedor/{any?}', function () {
    return response()->file(public_path('views/users/dashboard.html'));
})->where('any', '.*');