<?php

namespace App\Models;

final class BeverageProduct extends Product
{
    public function productFamily(): string
    {
        return 'beverage';
    }
}
