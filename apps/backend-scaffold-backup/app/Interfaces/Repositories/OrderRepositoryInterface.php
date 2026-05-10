<?php

namespace App\Interfaces\Repositories;

use App\DTOs\Orders\CreateOrderData;
use App\Models\Order;

interface OrderRepositoryInterface
{
    public function create(CreateOrderData $data, array $totals): Order;

    public function findById(string $id): ?Order;
}
