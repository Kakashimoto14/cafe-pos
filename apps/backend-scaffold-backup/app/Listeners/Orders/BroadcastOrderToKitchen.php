<?php

namespace App\Listeners\Orders;

use App\Events\Orders\OrderCreated;
use Illuminate\Contracts\Queue\ShouldQueue;

class BroadcastOrderToKitchen implements ShouldQueue
{
    public function handle(OrderCreated $event): void
    {
        // In the real Laravel runtime this listener would broadcast
        // the new order into the kitchen queue channel over Reverb.
    }
}
