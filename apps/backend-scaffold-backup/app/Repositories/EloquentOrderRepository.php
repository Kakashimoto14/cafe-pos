<?php

namespace App\Repositories;

use App\DTOs\Orders\CreateOrderData;
use App\Interfaces\Repositories\OrderRepositoryInterface;
use App\Models\Order;
use Illuminate\Support\Str;

class EloquentOrderRepository implements OrderRepositoryInterface
{
    public function create(CreateOrderData $data, array $totals): Order
    {
        return Order::create([
            'cashier_id' => $data->cashierId,
            'customer_id' => $data->customerId,
            'order_number' => 'ORD-' . Str::upper(Str::random(8)),
            'order_type' => $data->orderType,
            'status' => 'open',
            'notes' => $data->notes,
            'subtotal_amount' => $totals['subtotal'],
            'discount_amount' => $totals['discount'],
            'tax_amount' => $totals['tax'],
            'total_amount' => $totals['total'],
        ]);
    }

    public function findById(string $id): ?Order
    {
        return Order::find($id);
    }
}
