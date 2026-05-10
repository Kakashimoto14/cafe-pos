<?php

namespace App\Providers;

use App\Interfaces\Repositories\OrderRepositoryInterface;
use App\Repositories\EloquentOrderRepository;
use Illuminate\Support\ServiceProvider;

class DomainServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(OrderRepositoryInterface::class, EloquentOrderRepository::class);
    }
}
