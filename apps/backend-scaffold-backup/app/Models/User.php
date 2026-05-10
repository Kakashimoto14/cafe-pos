<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'pin_code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'role' => UserRole::class,
    ];

    public function canManageStore(): bool
    {
        return in_array($this->role, [UserRole::Admin, UserRole::Manager], true);
    }
}
