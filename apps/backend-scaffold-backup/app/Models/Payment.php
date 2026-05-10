<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'payment_type',
        'provider',
        'amount',
        'status',
        'reference',
        'metadata',
        'refunded_amount',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];
}
