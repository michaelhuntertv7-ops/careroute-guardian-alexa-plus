# Safety & Privacy Boundary

CareRoute Guardian is a care-journey coordination concept, not a medical device and not a clinical decision system.

## Hackathon boundary
- Synthetic data only.
- No real patient records or production medical data.
- No emergency dispatches.
- No diagnosis or clinical inference.
- No treatment selection or treatment modification.
- No claim to determine medical safety.
- No claim to detect or predict emergencies.
- No autonomous override of human healthcare professionals.

## Wellness/context data
The wearable panel demonstrates **user-authorized wellness/context signals** only. Signals are displayed as raw synthetic context. The engine does not classify them as safe/unsafe, normal/abnormal, or emergency/non-emergency.

## Escalation
Escalations are driven by predefined journey policy: missing transportation confirmation, unresolved handoff, or other operational exception. The output explains what was attempted, what evidence exists, what is unresolved, and which authorized human/service should review the exception.

## Privacy design direction
A production version should minimize data collection, separate identity from journey events where possible, enforce explicit authorization for care-circle recipients, encrypt stored/transmitted data, apply role-based access, log access, define retention/deletion policy, and undergo healthcare/privacy legal review before handling regulated data.
