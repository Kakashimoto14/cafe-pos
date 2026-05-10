<?php

it('creates an order through the versioned api contract', function (): void {
    $this->postJson('/api/v1/orders', [
        'cashier_id' => '3dfec82f-c25b-47a0-b7d1-a78e85970ab5',
        'order_type' => 'dine_in',
        'items' => [
            [
                'product_id' => '6dd90ecf-e100-4cb7-aa1d-6116d0124017',
                'quantity' => 1,
                'unit_price' => 18500,
            ],
        ],
    ])->assertCreated();
});
