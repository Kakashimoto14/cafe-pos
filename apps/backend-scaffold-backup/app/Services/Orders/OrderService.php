<?php

namespace App\Services\Orders;

use App\DTOs\Orders\CreateOrderData;
use App\Events\Orders\OrderCreated;
use App\Interfaces\Repositories\OrderRepositoryInterface;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

final class OrderService
{
    public function __construct(private readonly OrderRepositoryInterface $orders)
    {
    }

    public function create(CreateOrderData $data): Order
    {
        $totals = $this->calculateTotals($data->items);

        return DB::transaction(function () use ($data, $totals): Order {
            $order = $this->orders->create($data, $totals);

            Event::dispatch(new OrderCreated($order));

            return $order;
        });
    }

    private function calculateTotals(array $items): array
    {
        $subtotal = array_reduce(
            $items,
            fn (int $carry, array $item): int => $carry + ((int) $item['unit_price'] * (int) $item['quantity']),
            0
        );

        $discount = 0;
        $tax = (int) round($subtotal * 0.12);

        return [
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'total' => $subtotal - $discount + $tax,
        ];
    }
}
