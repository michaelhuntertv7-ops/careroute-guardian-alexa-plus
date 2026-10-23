# CareRoute Guardian — Architecture Freeze v1.0

## Decision
CareRoute Guardian uses a dependency-free browser architecture for the hackathon submission: static HTML/CSS, JavaScript ES modules, browser `localStorage`, synthetic provider adapters, and Node's built-in test runner.

This is deliberate. The demo's technical claim is not that a remote service magically succeeded; it is that the orchestration layer can preserve state, require evidence, reconcile exceptions, and fail closed.

## Layers
1. **Alexa+ simulation layer** — judge-facing conversational UI and typed utterances.
2. **Reconciliation engine** — deterministic state machine in `src/engine.js`.
3. **Provider abstraction** — synthetic transport and care-circle adapters in `src/providers.js`.
4. **Evidence ledger** — immutable-style evidence records referenced by state transitions.
5. **Durable state** — browser localStorage persists the journey across reloads.
6. **Judge interface** — journey timeline, unresolved state, evidence, escalation, caregiver status, and synthetic wellness context.
7. **Tests** — deterministic Node tests enforce prerequisite and evidence rules.

## State model
Primary statuses: `PENDING`, `ATTEMPTED`, `FAILED`, `CONFIRMED`, `BLOCKED`, `NEEDS_REVIEW`, `COMPLETED`.

Primary nodes: `appointment`, `transport_request`, `pickup`, `in_transit`, `clinic_arrival`, `treatment_handoff`, `caregiver_notification`, `return_trip`, `home_arrival`, `wellness_context`, `escalation_state`.

## Core invariant
**VERIFY → RECONCILE → ESCALATE OR CONTINUE**

A provider dispatch, API call, or attempted notification is not treated as proof that a real-world handoff completed. Protected terminal states require an evidence record.

## Fail-closed examples
- A transport booking does not imply pickup.
- Pickup does not imply clinic arrival.
- Clinic arrival does not imply a successful return ride.
- A return-ride dispatch attempt does not imply pickup.
- A confirmed return ride does not imply home arrival.

## Adapter strategy
Transport providers are represented behind adapter contracts. The hackathon build uses synthetic adapters only. Future production adapters could represent NEMT fleets, rideshare-health offerings, autonomous mobility providers, or caregiver transportation without changing core journey semantics.

Wellness devices are also adapters. The demo accepts user-authorized synthetic context only and performs no clinical interpretation.
