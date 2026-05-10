<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id')->index();
            $table->string('payment_type')->index();
            $table->string('provider')->index();
            $table->integer('amount');
            $table->integer('refunded_amount')->default(0);
            $table->string('status')->index();
            $table->string('reference')->nullable()->index();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
