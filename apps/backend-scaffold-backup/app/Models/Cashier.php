<?php

namespace App\Models;

use App\Enums\UserRole;

class Cashier extends User
{
    public function isFrontlineOperator(): bool
    {
        return $this->role === UserRole::Cashier;
    }
}
