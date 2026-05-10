<?php

namespace App\Models;

use App\Enums\UserRole;

class Admin extends User
{
    public function isSupervisory(): bool
    {
        return $this->role === UserRole::Admin;
    }
}
