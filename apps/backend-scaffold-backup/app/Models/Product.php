<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

abstract class Product extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'sku',
        'product_type',
        'price_amount',
        'is_active',
    ];

    abstract public function productFamily(): string;
}
