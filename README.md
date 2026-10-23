# CareRoute Guardian for Alexa+

> A stateful Alexa+ simulated experience that verifies real-world care-journey handoffs before advancing the journey.

**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon — Alexa+ Track  
**Scenario:** Recurring dialysis transportation, synthetic data only  
**Core rule:** **VERIFY → RECONCILE → ESCALATE OR CONTINUE**

## Why this exists
A provider action being attempted is not proof that the physical handoff succeeded. CareRoute Guardian explicitly distinguishes `ATTEMPTED`, `FAILED`, `CONFIRMED`, `BLOCKED`, `NEEDS_REVIEW`, and `COMPLETED` states across the journey:

**HOME → TRANSPORTATION → CLINIC → APPOINTMENT HANDOFF → RETURN TRANSPORTATION → HOME**

The primary demo shows a missed 7:15 AM ride for an 8:00 AM dialysis appointment, backup transportation, verified pickup, verified clinic arrival, and a later return-trip exception that fails closed and escalates to human review.

## Alexa+ track implementation
This repository uses the competition-permitted **simulated Alexa+ web experience** path. The Alexa+ interaction layer is simulated; the underlying journey state machine, evidence rules, reconciliation, provider abstractions, persistence, and tests are real deterministic code in this repo.

No Alexa+ gated preview access, production healthcare integration, or runtime AI model is required for this simulation.

## Run locally
Requires Node.js 20+.

```bash
npm run serve
```

Open `http://localhost:4173`.

No `npm install` is required because there are zero runtime or test dependencies.

## Test

```bash
npm test
```

The test suite checks fail-closed prerequisites, evidence requirements, deterministic history, exception handling, human-review gating, and the no-diagnosis wellness boundary.

## Judge path
Use **Run 45-sec judge path** or step through:

1. `Alexa, is my dialysis ride coming?`
2. `Alexa, continue.`
3. Verify pickup.
4. Verify clinic arrival.
5. Trigger the return-ride exception.

Watch the timeline, unresolved-handoff panel, evidence ledger, caregiver status, and escalation state.

## Project structure

```text
index.html                  Judge-facing Alexa+ simulation
styles.css                  Responsive UI
src/engine.js               Deterministic state/reconciliation engine
src/providers.js            Synthetic provider + wellness adapters
src/app.js                  UI, local persistence, utterance mapping
tests/engine.test.js        Automated deterministic tests
docs/ARCHITECTURE.md        Architecture freeze
docs/SAFETY_PRIVACY.md      Medical/privacy boundary
docs/FRICTION_LOG.md        Hackathon friction log
docs/PRODUCT_FEEDBACK.md    Required product feedback draft
docs/FEATURE_REQUESTS.md    Optional feature requests
docs/DEMO_SCRIPT.md         <3-minute video script
docs/DEVPOST_WRITEUP.md     Submission write-up draft
```

## Safety boundary
CareRoute Guardian is not a medical device. This hackathon build:

- uses synthetic data only;
- does not diagnose illness;
- does not select or change treatment;
- does not determine medical safety;
- does not detect or predict emergencies;
- does not dispatch real emergency services;
- uses operational, predefined escalation policy with human review.

The wearable panel shows **user-authorized wellness/context signals** with no clinical interpretation.

## Provider and brand boundary
Named transportation or wearable vendors may be discussed as future adapter examples only. The demo does not claim affiliation with, endorsement by, or live integration to any such company.

## License
MIT. Public repository status is for judge access and does **not** mean this project is being entered into the hackathon's Open Source mini-challenge.
