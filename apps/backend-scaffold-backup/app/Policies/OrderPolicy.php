<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    public function refund(User $user, Order $order): bool
    {
        return $user->canManageStore() && $order->status !== 'voided';
    }
}
