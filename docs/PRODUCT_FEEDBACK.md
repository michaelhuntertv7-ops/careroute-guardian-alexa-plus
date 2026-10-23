# Product Feedback — Alexa+ Track

## What we used
We used the competition-permitted Alexa+ simulated web-experience path to prototype an agentic care-journey orchestration concept. The runtime is a deterministic browser-based state/reconciliation engine with synthetic provider adapters.

## What worked well
The simulation option is valuable because it lets builders demonstrate genuinely agentic Alexa+ interaction models without requiring access to gated preview tooling. Organizer clarification that voice is optional and that the interaction layer may be simulated helped us focus on workflow quality, statefulness, explainability, and safety.

## What needs work
The official materials could make the simulation path more discoverable and internally consistent. A concise starter page should state: no gated Alexa+ tools are required, voice is optional, custom web UI is allowed, deterministic runtime logic is acceptable, and the demo/repo must clearly show a functional Alexa+ use case.

## Onboarding
Once the simulation exception was found, onboarding was straightforward. The most time-consuming step was reconciling the general track-technology wording with the simulation-specific exception across rules, FAQ, and organizer discussion replies.

## Would we build with Alexa+ again?
Yes. Alexa+ is a strong fit for multi-step, stateful coordination where a user needs a trusted conversational interface to understand what happened, what remains unresolved, and what action is safe to take next. Production development would benefit from broader access to the real Add-on tooling and a public simulator.
