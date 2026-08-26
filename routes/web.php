<?php

use App\Http\Controllers\CampanaController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\DashboardPageController;
use App\Http\Controllers\ImportBatchController;
use App\Http\Controllers\InteraccionController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\SegmentoController;
use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\TagController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', DashboardPageController::class)->name('dashboard');

    Route::get('/clientes', [ClienteController::class, 'index'])->name('clientes.index');
    Route::post('/clientes', [ClienteController::class, 'store'])->name('clientes.store');
    Route::get('/clientes/{cliente}', [ClienteController::class, 'show'])->name('clientes.show');
    Route::put('/clientes/{cliente}', [ClienteController::class, 'update'])->name('clientes.update');

    Route::get('/campanas', [CampanaController::class, 'index'])->name('campanas.index');
    Route::post('/campanas', [CampanaController::class, 'store'])->name('campanas.store');
    Route::get('/campanas/{campana}', [CampanaController::class, 'show'])->name('campanas.show');
    Route::put('/campanas/{campana}', [CampanaController::class, 'update'])->name('campanas.update');

    Route::get('/interacciones', [InteraccionController::class, 'index'])->name('interacciones.index');

    Route::get('/segmentos', [SegmentoController::class, 'index'])->name('segmentos.index');
    Route::post('/segmentos', [SegmentoController::class, 'store'])->name('segmentos.store');
    Route::put('/segmentos/{segmento}', [SegmentoController::class, 'update'])->name('segmentos.update');

    Route::get('/tags', [TagController::class, 'index'])->name('tags.index');
    Route::post('/tags', [TagController::class, 'store'])->name('tags.store');
    Route::put('/tags/{tag}', [TagController::class, 'update'])->name('tags.update');

    Route::get('/productos', [ProductoController::class, 'index'])->name('productos.index');
    Route::post('/productos', [ProductoController::class, 'store'])->name('productos.store');
    Route::put('/productos/{producto}', [ProductoController::class, 'update'])->name('productos.update');

    Route::get('/imports', [ImportBatchController::class, 'index'])->name('imports.index');
    Route::get('/imports/{import}', [ImportBatchController::class, 'show'])->name('imports.show');

    Route::get('/settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::get('/settings/appearance', [AppearanceController::class, 'edit'])->name('appearance.edit');
});
