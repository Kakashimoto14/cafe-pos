<?php

namespace App\Models;

use App\Enums\UserRole;

class Manager extends User
{
    public function isSupervisory(): bool
    {
        return $this->role === UserRole::Manager;
    }
}
