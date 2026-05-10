<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('cashier_id')->index();
            $table->uuid('customer_id')->nullable()->index();
            $table->string('order_number')->unique();
            $table->string('order_type')->index();
            $table->string('status')->index();
            $table->text('notes')->nullable();
            $table->integer('subtotal_amount');
            $table->integer('discount_amount')->default(0);
            $table->integer('tax_amount')->default(0);
            $table->integer('total_amount');
            $table->timestamps();

            $table->foreign('cashier_id')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
