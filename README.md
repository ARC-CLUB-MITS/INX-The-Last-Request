# INX: The Last Request — High-Concurrency Resource Allocation Engine

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-blue.svg)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan.svg)](https://tailwindcss.com/)
[![K6 Verified](https://img.shields.io/badge/K6-1000%20VUs%20Passed-purple.svg)](https://k6.io/)

> **Mission Objective**: Guarantee absolute data consistency, zero double-allocations, zero negative inventory, and sub-millisecond ACID integrity when thousands of concurrent operatives attempt to claim a finite pool of 100 mission-critical Cryo-Stasis Core Pods.

---

## 🚀 System Architecture Overview

```
[ 1,000+ Concurrent Operatives / K6 VUs ]
                  │
                  ▼
   [ Next.js 14 Web UI + SSE Stream ]
                  │ (HTTP REST / SSE)
                  ▼
     [ Node.js + TypeScript Backend ]
     ├─ Zod Request Validation
     ├─ Idempotency Engine
     └─ Transactional Unit of Work
                  │
                  ▼
       [ PostgreSQL 15 Engine ]
     ├─ Row-Level Lock: SELECT ... FOR UPDATE
     ├─ Non-blocking Lock: SELECT ... FOR UPDATE SKIP LOCKED
     ├─ Check Constraints: (chk_resource_state_integrity)
     └─ Append-Only Audit Ledger: (resource_audit_logs)
```

---

## 📦 Project Structure

```
the-last-request/
├── backend/
│   ├── src/
│   │   ├── config/env.ts              # Configuration loader
│   │   ├── controllers/               # Express route handlers with Zod validation
│   │   ├── db/
│   │   │   ├── pool.ts                # pg.Pool connection & ACID transaction wrapper
│   │   │   ├── schema.sql             # PostgreSQL schema with constraints & indexes
│   │   │   ├── migrate.ts             # Automated migration runner
│   │   │   └── seed.ts                # 100 Cryo-Pod resource seeder
│   │   ├── routes/api.ts              # REST & SSE route definitions
│   │   ├── services/
│   │   │   ├── allocation.service.ts  # Core pessimistic locking & SKIP LOCKED engine
│   │   │   └── audit.service.ts       # Immutable ledger recording & SSE event bus
│   │   ├── types/index.ts             # Strict TypeScript domain interfaces
│   │   └── server.ts                  # Express application entrypoint & telemetry
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Sci-Fi Landing Page (Lore, Stakes, CTAs)
│   │   │   ├── dashboard/page.tsx     # Real-Time Availability Matrix & Control Grid
│   │   │   ├── globals.css            # Tailwind cyberpunk glowing theme
│   │   │   └── layout.tsx             # Root Layout
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # System status & quick reset bar
│   │   │   ├── ResourceCard.tsx       # Individual pod status & allocation card
│   │   │   ├── StatsOverview.tsx      # System capacity & tier breakdown
│   │   │   ├── AllocationModal.tsx    # Interactive allocation execution dialog
│   │   │   ├── AuditLogTable.tsx      # Live mutating audit trail table
│   │   │   └── StressTester.tsx       # In-browser 1,000-request live stress tester
│   │   └── lib/                       # API client & domain types
│   ├── package.json
│   └── tailwind.config.ts
├── k6/
│   └── concurrency_test.js            # Official K6 load test (500 hotspot + 1000 burst VUs)
├── tests/
│   ├── concurrency.stress.ts          # Native Node.js 1,000 concurrent request runner
│   └── lifecycle.test.ts              # Lifecycle, idempotency & edge-case test suite
├── docker-compose.yml                 # One-click PostgreSQL 15 deployment
├── README.md
├── ARCHITECTURE.md
├── DECISIONS.md
└── TESTING.md
```

---

## 🛠️ Quick Start & Local Execution

### Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **PostgreSQL**: v14+ (or Docker)

### Option A: Zero-Prerequisite Instant Run (No Docker or PostgreSQL install required)

The system includes an embedded in-memory PostgreSQL engine fallback with full ACID transactions and row-level locks, so you can run the entire system instantly:

1. **Start Backend Service**:
   ```bash
   cd backend
   npm install
   npm run seed       # Initializes schema and seeds 100 Cryo-Pods
   npm run dev        # Starts API server on http://localhost:4000
   ```

2. **Start Next.js Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev        # Starts UI on http://localhost:3000
   ```

3. **Open the Application**:
   - **Landing Page**: [http://localhost:3000](http://localhost:3000)
   - **Live Availability Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

### Option B: Using Docker for PostgreSQL (When Docker is installed)

1. **Start PostgreSQL**:
   ```bash
   docker compose up -d
   ```
2. Run `npm run seed` and `npm run dev` in `backend/`.

---

### Option C: Local PostgreSQL Service

If you have a PostgreSQL service running locally:
1. Ensure a database named `the_last_request` exists (or adjust `backend/.env` with your credentials).
2. Configure `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/the_last_request
   PORT=4000
   ```
3. Run `npm run seed` in `backend/` and start both services.

---

## ⚡ Running Concurrency Proofs

### 1. In-Browser Concurrency Simulator (Zero Setup)
Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) and navigate to the **"In-Browser Concurrency Stress Proof"** panel:
- Select **1,000 Simultaneous Requests**.
- Choose either **Hotspot Attack** (500+ requests targeting Pod #1) or **Pool Exhaustion**.
- Click **"Launch Concurrency Burst"** and observe real-time row locking, zero double allocations, and automatic SSE updates.

### 2. Node.js Asynchronous Concurrency Runner (1,000 Requests)
Run from the repository root:
```bash
npm run test:concurrency --prefix backend
```

### 3. Official K6 Load Test (1,000 VUs)
Run using K6 CLI:
```bash
k6 run k6/concurrency_test.js
```

---

## 🛡️ Key System Guarantees

| Invariant | Mechanism | Outcome |
| :--- | :--- | :--- |
| **Zero Double-Allocations** | PostgreSQL `SELECT ... FOR UPDATE` row locks | Only 1 transaction succeeds; all others receive clean `409 Conflict`. |
| **Zero Negative Inventory** | Check constraint `chk_resource_state_integrity` | Pool capacity cannot drop below 0 or exceed 100. |
| **Deadlock-Free Scaling** | `SELECT ... FOR UPDATE SKIP LOCKED` | Auto-allocations bypass locked rows without head-of-line blocking. |
| **Safe Client Retries** | Unique `idempotency_key` indexes | Repeated requests replay previous outcome without mutating state. |
| **Full Traceability** | Append-only `resource_audit_logs` | Every transition is immutably logged with timestamp and user metadata. |

---

## 📄 Documentation Links
- [**ARCHITECTURE.md**](./ARCHITECTURE.md): Deep-dive into database schema, transaction flows, and Mermaid.js diagrams.
- [**DECISIONS.md**](./DECISIONS.md): Architectural defense of PostgreSQL row-locking over alternatives (Redis/Distributed locks).
- [**TESTING.md**](./TESTING.md): Comprehensive test matrix, K6 results, edge-case analysis, and failure handling.
