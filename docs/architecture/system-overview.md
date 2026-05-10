# System Overview

## Architectural Style

The system uses a modular monolith architecture:

- one deployable Laravel backend
- one deployable React frontend
- strong internal module boundaries
- shared contracts for frontend and backend alignment

This gives us faster delivery than microservices while preserving clear ownership and extensibility.

## Core Domains

- Auth and Identity
- POS Sales Engine
- Catalog and Product Management
- Inventory and Recipes
- Payments and Reconciliation
- Shifts and Cash Management
- Customers and Loyalty
- Reporting and Analytics
- Audit and Compliance
- Realtime Operations

## Backend Application Layers

- `Http`: transport concerns only
- `DTOs`: validated inbound and outbound contracts
- `Actions`: focused use-case operations
- `Services`: orchestration and domain workflows
- `Repositories`: data access abstractions
- `Models`: Eloquent entities
- `Policies`: authorization rules
- `Events` and `Listeners`: asynchronous and realtime reactions
- `ValueObjects`: immutable domain primitives such as money and tax summaries

## Frontend Application Layers

- `pages`: route-level entry points
- `layouts`: shell composition
- `features`: domain-specific UI and hooks
- `components`: reusable presentation and interaction pieces
- `stores`: low-latency POS state
- `api` and `services`: server interaction boundaries
- `types`: domain contracts and frontend-specific views

## Realtime and Offline Strategy

- Realtime synchronization uses Laravel Reverb and WebSockets
- terminal state stays responsive via local Zustand stores
- optimistic updates keep cashier flows instant
- IndexedDB-backed sync queues should be added in the next phase for offline order buffering and stock sync

## Scaling Approach

- Postgres for transactional integrity
- Redis for queues, caching, locks, and websockets
- queue-driven side effects for receipts, audit fanout, notifications, and low-stock alerts
- horizontal app scaling behind Nginx once the monolith matures
