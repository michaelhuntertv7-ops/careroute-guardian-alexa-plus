# CareRoute Guardian for Alexa+

## Inspiration
Recurring medical transportation has a dangerous coordination problem: systems often know that an action was attempted, but not whether the real-world handoff actually happened. A ride can be dispatched without arriving. A booking can be confirmed without pickup. A pickup can happen without the clinic knowing the patient is delayed. A return ride can fail after the appointment is over.

CareRoute Guardian explores a simple rule: **verify before you advance the journey.**

## What it does
CareRoute Guardian is a stateful Alexa+ simulated experience for a dialysis patient traveling from home to an 8:00 AM appointment and back.

The system tracks each handoff independently across:

**HOME → TRANSPORTATION → CLINIC → APPOINTMENT HANDOFF → RETURN TRANSPORTATION → HOME**

When the scheduled 7:15 AM ride does not arrive, CareRoute does not optimistically mark transportation complete. It records the attempted check, captures evidence that pickup was not confirmed, blocks downstream travel states, informs the authorized caregiver, and offers the approved backup workflow.

When a replacement ride is confirmed, pickup remains pending until separate evidence arrives. Clinic arrival is also verified independently. Later, when the return ride is dispatched but pickup is not confirmed, the system fails closed again: home arrival stays blocked and a predefined escalation policy routes the unresolved exception to human review.

## How we built it
The hackathon version uses the competition-permitted Alexa+ simulated web-experience path.

- Static HTML/CSS judge interface
- JavaScript ES-module deterministic state machine
- Browser localStorage for durable journey state across reloads
- Synthetic transport, clinic, caregiver, and wearable/context adapters
- Deterministic evidence ledger and auditable history
- Explicit action prerequisites and fail-closed transitions
- Node built-in automated test suite with no runtime dependencies
- GitHub Actions CI for repeatable tests

The core rule is:

**VERIFY → RECONCILE → ESCALATE OR CONTINUE**

Statuses are explicit: `PENDING`, `ATTEMPTED`, `FAILED`, `CONFIRMED`, `BLOCKED`, `NEEDS_REVIEW`, and `COMPLETED`.

## What makes it agentic
This is not a single-turn Q&A bot. Alexa+ is the conversational control surface for a multi-step workflow that maintains state across a care journey, reasons over prerequisites, orchestrates provider abstractions, preserves unresolved work, and explains why the next action is or is not allowed.

The engine differentiates between attempted actions and verified outcomes, which is especially important when software coordinates real-world services.

## Safety and privacy boundary
This project uses synthetic data only. It does not diagnose illness, determine clinical treatment, detect medical emergencies, determine medical safety, or replace healthcare professionals.

The wearable/context panel demonstrates **user-authorized wellness/context signals** without clinical interpretation. Escalations are operational and policy-based, such as a missing transportation confirmation, and can require **human review**.

No production medical records, real patient data, or real emergency dispatches are used.

## Challenges we ran into
The most important implementation challenge was understanding the Alexa+ simulation path. The organizer materials clarify that hackathon participants do not receive general access to gated Alexa+ Add-on tooling and may instead build a simulated web experience. We therefore concentrated our engineering effort on the real orchestration behavior behind the interaction: state, evidence, reconciliation, safety gates, and explainability.

## Accomplishments we are proud of
- A judge can understand the core idea in seconds from the timeline and unresolved/evidence panels.
- Booking, pickup, clinic arrival, return pickup, and home arrival are not collapsed into one optimistic status.
- Every protected transition is evidence-backed.
- The return-trip exception visibly demonstrates fail-closed behavior and human review.
- The build has zero runtime dependencies and a deterministic automated test suite.
- The architecture is provider-agnostic without claiming affiliation with any transport or wearable company.

## What we learned
Agentic systems become more trustworthy when they model uncertainty explicitly. "Attempted" and "confirmed" are not synonyms. Durable state and evidence lineage matter as much as conversational fluency when an assistant coordinates real-world tasks.

## What's next
A production roadmap would add authorized provider integrations, secure identity and consent, clinic/caregiver interfaces, policy configuration, audit controls, privacy/security review, and domain-specific validation. The same verified-handoff architecture could later support chemotherapy, physical therapy, senior transportation, post-operative mobility, disability transportation, chronic-care visits, and home-health transitions.
