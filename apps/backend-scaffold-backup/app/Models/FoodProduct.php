<?php

namespace App\Models;

final class FoodProduct extends Product
{
    public function productFamily(): string
    {
        return 'food';
    }
}
