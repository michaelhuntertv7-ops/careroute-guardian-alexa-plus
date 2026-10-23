# Friction Log

## F1 — Alexa+ preview tooling is gated
- **Task attempted:** Determine the official Alexa+ implementation path available to hackathon participants.
- **Expected:** Direct access to Alexa+ Add-on developer preview tools or a public simulator.
- **Actual:** Organizer FAQ states gated Category SDK, MCP Toolkit, CLI, and Web Simulator are not available to general hackathon participants.
- **Severity:** Important.
- **Workaround:** Use the explicitly permitted simulated Alexa+ web-experience path with a real deterministic orchestration backend.
- **Actionable suggestion:** Put the simulated-path guidance and a minimal starter template directly in the Alexa+ track requirements, not only in FAQ/discussion clarifications.

## F2 — Requirement wording can appear stricter than the simulation exception
- **Task attempted:** Reconcile the repo requirement that track technology appear in code with the Alexa+ simulation option.
- **Expected:** One unambiguous rule for simulated entries.
- **Actual:** General wording references required technology in code, while the Alexa+ exception says no specific framework/SDK is required when the repo includes simulation source and the demo shows it working.
- **Severity:** Moderate.
- **Workaround:** Explicitly identify this project as the Alexa+ simulated-experience path and include the complete simulator source in the repo.
- **Actionable suggestion:** Add a dedicated "Alexa+ simulated submission checklist" subsection to the rules.
