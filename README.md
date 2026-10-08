INX: The Last Request

Challenge

Build a resource allocation system that manages a finite resource pool and remains correct when many users attempt to claim resources at the same time.

A typical allocation flow looks simple:

Check availability
        ↓
Reserve
        ↓
Done

The problem appears when thousands of users attempt to reserve the same resource at nearly the same time.

Two users may see the same resource as available. Both may attempt to claim it, and both may receive a success response. If the system does not handle concurrency correctly, the same resource can be allocated more than once.

Your system must prevent this and maintain a consistent state under concurrent requests.

The core flow is:

Finite Resources
       ↓
Concurrent Requests
       ↓
Allocation Logic
       ↓
Consistent State
       ↓
Verified Result

A single-use resource must never be reported as successfully allocated to two different users.

Choose Your Scenario

You may decide what the scarce resource represents.

Examples include:

* Event seats
* Appointment slots
* Interview slots
* Lab equipment
* Hotel rooms
* Limited inventory
* Parking spaces
* Workshop seats
* Examination slots

The scenario is up to your team. The underlying engineering problem remains the same: maintaining correctness when multiple requests compete for limited resources.

What to Build

1. Resource Model

The system must represent a finite collection of resources.

For example:

Event
 ├── Seat A01
 ├── Seat A02
 ├── Seat A03
 └── ...

Or:

Appointment
 ├── 10:00
 ├── 10:30
 ├── 11:00
 └── ...

The resource model must make availability unambiguous.

2. Availability

Users must be able to determine which resources are currently available.

A resource that has already been successfully allocated must not continue to appear as available.

3. Allocation

A user must be able to request a resource.

The system should return a clear result:

SUCCESS
Resource allocated.

or:

FAILED
Resource is no longer available.

4. Concurrent Requests

The system must handle multiple requests attempting to allocate the same resource at approximately the same time.

For example:

User A ────────┐
               │
User B ────────┼──→ Resource A01
               │
User C ────────┘

Only one request should successfully claim a single-use resource.

5. Consistent State

The system must prevent invalid states such as:

Available resources = -3

or:

User A → Seat A01
User B → Seat A01

It must also prevent mismatches such as:

System says:
Seat A01 = Available
Database says:
Seat A01 = Allocated

The source of truth and user-visible state should remain consistent according to the guarantees defined by your system.

6. Cancellation and Release

The system must provide a way to release an allocation.

For example:

Allocated
   ↓
Cancelled
   ↓
Available

Define the rules for when and how a released resource becomes available again.

7. Allocation History

The system should retain enough information to understand what happened to a resource.

For example:

Resource: A01
10:02:11  Requested by U17
10:02:11  Allocated to U17
10:05:43  Cancelled by U17
10:06:02  Allocated to U42

The exact representation is up to your team.

Concurrency Test

A normal manual demonstration is not sufficient.

Your solution must include a way to reproduce concurrent requests.

For example:

100 resources
       +
1,000 simultaneous requests
       ↓
Allocation system
       ↓
Final state

The test should demonstrate that the system remains correct under contention.

The exact load is up to your team, but it must be large enough to expose race conditions.

Constraints

Finite Resources

The system must work with a clearly defined finite resource pool.

The resource count must be configurable. Do not hardcode the final answer.

Real Concurrency

The concurrency test must generate genuinely overlapping requests.

Sending 1,000 requests sequentially does not constitute a concurrency test.

No ARC Infrastructure

ARC will not provide:

* A production server
* A database
* A load-testing environment
* A reservation service
* A pre-built application

The system must be demonstrable using your own implementation and local or publicly available tooling.

No Prescribed Solution

You are not required to use a particular concurrency mechanism.

Possible approaches include:

* Database transactions
* Row-level locking
* Optimistic concurrency
* Atomic operations
* Queues
* Idempotency
* Distributed locks
* Other mechanisms

The choice of approach is up to your team.

Evaluation

Correctness

Does the system actually prevent double allocation?

Correctness takes priority over interface quality.

Concurrency

Does the system remain correct when requests overlap?

Data Integrity

Can the team demonstrate that the stored state remains valid?

Failure Handling

The system should have defined behavior for cases such as:

* A request being retried
* A client disconnecting
* Two requests arriving together
* An allocation failing partway through
* A cancellation occurring while another request is waiting

Engineering Judgment

The team should be able to explain why its chosen concurrency strategy is appropriate for the system.

Technical Choices

Your team chooses:

* Resource scenario
* Database
* Backend framework
* Allocation strategy
* Concurrency mechanism
* API design
* UI
* Load-testing approach
* Failure-handling strategy
* Reservation policy

There is no prescribed architecture.

Optional Enhancements

The following are optional:

* Idempotency
* Reservation expiry
* Queueing
* Rate limiting
* Retry-safe operations
* Load-testing dashboard
* Failure injection
* Distributed allocation
* Transaction monitoring
* Allocation analytics
* Recovery mechanisms

Do not add distributed infrastructure simply because the challenge involves concurrency. A simple, correct solution is better than a complicated and unreliable one.

Acceptance Criteria

* [ ]	A finite resource pool exists.
* [ ]	Current availability can be viewed.
* [ ]	Resources can be allocated.
* [ ]	Resources cannot be allocated twice.
* [ ]	Inventory cannot become negative.
* [ ]	Concurrent requests are handled.
* [ ]	Resources can be cancelled or released according to defined rules.
* [ ]	Allocation history can be inspected.
* [ ]	A reproducible concurrency test exists.
* [ ]	The system can demonstrate contention on the same resource.
* [ ]	The final state remains consistent after the test.
* [ ]	Failure behavior is documented.

Submission Requirements

The repository must contain enough information for another developer to understand and run the solution.

At minimum:

README.md
ARCHITECTURE.md
DECISIONS.md
TESTING.md

ARCHITECTURE.md

Document:

* System components
* Request flow
* Resource model
* Storage model
* Concurrency mechanism
* Failure handling

Include an architecture diagram.

DECISIONS.md

Explain:

* Why you selected your concurrency strategy
* Why you selected your database or storage mechanism
* How consistency is maintained
* What trade-offs you accepted
* What you would change for a much larger system

TESTING.md

This document must include concurrency testing.

Document:

* Normal allocation tests
* Duplicate allocation tests
* Concurrent allocation tests
* Cancellation tests
* Retry behavior
* Failure and edge cases
* Observed results

Demo Expectations

The demo should reach the concurrency test quickly.

Recommended flow:

1. Introduce the resource
        ↓
2. Show available resources
        ↓
3. Perform a normal allocation
        ↓
4. Show the allocation
        ↓
5. Start concurrent requests
        ↓
6. Attempt to claim the same resource
        ↓
7. Show the results
        ↓
8. Verify final state
        ↓
9. Demonstrate cancellation or release
        ↓
10. Explain the concurrency strategy
        ↓
11. Defend the design

The concurrency test should be visible during the demonstration.

Do not simply state that the system is thread-safe. Show evidence from the test.

Event-Day Challenge

During evaluation, judges may change the conditions.

For example, they may:

* Increase the number of concurrent requests.
* Reduce the number of available resources.
* Retry the same request.
* Attempt multiple requests for the same resource.
* Cancel an allocation and immediately request the resource again.

Your team should be able to explain which guarantees the system maintains under these conditions.

Rules

* Build your own solution.
* AI-assisted development is allowed.
* Public libraries and tools are allowed.
* Do not depend on an ARC-owned backend or database.
* Do not commit private credentials.
* Be prepared to explain the concurrency strategy.
* Do not claim guarantees that your implementation cannot demonstrate.
* Core requirements take priority over optional features.

Final Checklist

Before submission:

* [ ]	Resource model is clearly defined.
* [ ]	Resource availability works.
* [ ]	Allocation works.
* [ ]	Double allocation is prevented.
* [ ]	Negative inventory is impossible under the defined model.
* [ ]	Concurrent requests have been tested.
* [ ]	Same-resource contention has been tested.
* [ ]	Cancellation or release works.
* [ ]	Allocation history works.
* [ ]	Retry behavior is understood.
* [ ]	Failure cases are documented.
* [ ]	Concurrency strategy is documented.
* [ ]	No secrets are committed.
* [ ]	Architecture is documented.
* [ ]	Technical decisions are documented.
* [ ]	Testing is documented.
* [ ]	Demo is ready.

INNOVEX|ARC Club