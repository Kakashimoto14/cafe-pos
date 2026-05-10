<?php

use App\Http\Controllers\Api\V1\OrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::middleware(['auth:sanctum'])->group(function (): void {
        Route::apiResource('orders', OrderController::class)->only(['index', 'store', 'show']);
    });
});
