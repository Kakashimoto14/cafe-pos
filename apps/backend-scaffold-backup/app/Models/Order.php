<?php

namespace App\Models;

use App\Enums\OrderType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Order extends Model
{
    use HasUuids;

    protected $fillable = [
        'cashier_id',
        'customer_id',
        'order_number',
        'order_type',
        'status',
        'notes',
        'subtotal_amount',
        'discount_amount',
        'tax_amount',
        'total_amount',
    ];

    protected $casts = [
        'order_type' => OrderType::class,
    ];
}
