# Public Demo Script — target 2:25

**0:00–0:15 — Problem + product**
"A ride being dispatched is not the same as a patient being picked up. CareRoute Guardian is an Alexa+ simulated experience that keeps a recurring-care journey honest from home to clinic and back."

**0:15–0:30 — Interface**
Show the journey timeline, current action, unresolved count, evidence ledger, caregiver status, and safety boundary. State: "Every important handoff has its own state and evidence."

**0:30–0:58 — Missed outbound ride**
Ask: "Alexa, is my dialysis ride coming?" Show primary transport becomes FAILED, transit stays BLOCKED, caregiver becomes CONFIRMED, and evidence appears. Say: "It does not mark transportation complete because a pickup was attempted."

**0:58–1:22 — Backup and verified pickup**
Say: "Alexa, continue." Show backup ride CONFIRMED but pickup still PENDING. Then verify pickup. Highlight that transit becomes CONFIRMED only after pickup evidence.

**1:22–1:38 — Clinic handoff**
Verify clinic arrival. Show clinic CONFIRMED and non-clinical appointment handoff COMPLETED. Mention caregiver confirmation.

**1:38–2:05 — Return exception**
Trigger return-trip exception. Show dispatch attempt followed by FAILED, home arrival BLOCKED, escalation NEEDS_REVIEW, and caregiver notification. Say: "The engine explains exactly what happened, what evidence exists, what is unresolved, and who needs to review next."

**2:05–2:25 — Technical and impact close**
Show the evidence ledger and safety panel. "The engine is deterministic, locally durable across reloads, provider-agnostic, tested, and uses synthetic data only. Today it is dialysis; the same verified-handoff architecture can extend to chemotherapy, physical therapy, senior mobility, and other recurring care journeys."
