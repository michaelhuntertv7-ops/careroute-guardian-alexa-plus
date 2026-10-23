import { syntheticTransportAdapters, getSyntheticWellnessContext } from './providers.js';

export const STATUS = Object.freeze({
  PENDING: 'PENDING',
  ATTEMPTED: 'ATTEMPTED',
  FAILED: 'FAILED',
  CONFIRMED: 'CONFIRMED',
  BLOCKED: 'BLOCKED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  COMPLETED: 'COMPLETED'
});

const PROTECTED = new Set([STATUS.CONFIRMED, STATUS.COMPLETED, STATUS.FAILED]);

function node(status, label, detail = '') { return { status, label, detail, evidenceIds: [] }; }

export function createInitialState() {
  const state = {
    schemaVersion: 1,
    scenarioId: 'dialysis-0800-synthetic',
    patient_context: { synthetic: true, label: 'Demo Patient', caregiverAuthorized: true, wellnessAuthorized: true },
    appointment: { status: STATUS.CONFIRMED, scheduled: '08:00', service: 'Recurring dialysis appointment', evidenceIds: [] },
    transport_request: node(STATUS.PENDING, 'Outbound transportation', 'Primary ride scheduled for 7:15 AM.'),
    pickup: node(STATUS.PENDING, 'Pickup verification'),
    in_transit: node(STATUS.BLOCKED, 'In transit'),
    clinic_arrival: node(STATUS.BLOCKED, 'Clinic arrival'),
    treatment_handoff: node(STATUS.BLOCKED, 'Appointment handoff', 'Non-clinical handoff only.'),
    caregiver_notification: node(STATUS.PENDING, 'Caregiver notification'),
    return_trip: node(STATUS.BLOCKED, 'Return transportation'),
    home_arrival: node(STATUS.BLOCKED, 'Home arrival'),
    wellness_context: { status: STATUS.CONFIRMED, ...getSyntheticWellnessContext(), evidenceIds: [] },
    escalation_state: node(STATUS.PENDING, 'Escalation state'),
    evidence: [],
    history: [],
    conversation: [
      { role: 'alexa', text: 'CareRoute Guardian is ready. Your 8:00 AM recurring-care appointment is loaded with synthetic demo data.' }
    ],
    nextAction: 'CHECK_RIDE',
    lastExplanation: {
      action: 'Check scheduled ride',
      why: 'The pickup window is active, but transportation has not been verified.',
      evidence: ['Appointment is confirmed for 8:00 AM.'],
      unresolved: ['Outbound pickup is still pending.']
    }
  };
  const apptEvidence = addEvidence(state, {
    source: 'synthetic-clinic-schedule', type: 'appointment_confirmation',
    summary: 'Synthetic appointment is confirmed for 8:00 AM.', data: { scheduled: '08:00' }
  });
  state.appointment.evidenceIds.push(apptEvidence.id);
  const homeEvidence = addEvidence(state, {
    source: 'synthetic-user-context', type: 'home_start_state', summary: 'Journey begins at home with the patient ready for pickup.', data: { locationClass: 'home', ready: true }
  });
  state.history.push(historyEvent('SCENARIO_INITIALIZED', 'CONFIRMED', homeEvidence.id, 'Synthetic scenario initialized.'));
  return state;
}

export function addEvidence(state, input) {
  const id = `EV-${String(state.evidence.length + 1).padStart(3, '0')}`;
  const record = { id, at: syntheticTimestamp(state.evidence.length), ...input };
  state.evidence.push(record);
  return record;
}

function syntheticTimestamp(index) {
  const base = new Date('2026-10-23T07:14:00-05:00');
  return new Date(base.getTime() + index * 60_000).toISOString();
}

function historyEvent(action, status, evidenceId, note) {
  return { action, status, evidenceId: evidenceId || null, note };
}

function setNode(state, key, nextStatus, evidenceId, detail) {
  if (!state[key] || typeof state[key] !== 'object') throw new Error(`Unknown state node: ${key}`);
  if (PROTECTED.has(nextStatus) && !evidenceId) throw new Error(`${nextStatus} requires evidence for ${key}`);
  state[key].status = nextStatus;
  if (evidenceId) state[key].evidenceIds.push(evidenceId);
  if (detail) state[key].detail = detail;
  state.history.push(historyEvent(key, nextStatus, evidenceId, detail || ''));
}

function requireStatus(state, key, accepted, reason) {
  const statuses = Array.isArray(accepted) ? accepted : [accepted];
  if (!statuses.includes(state[key].status)) throw new Error(reason || `${key} must be ${statuses.join(' or ')}`);
}

function say(state, role, text) { state.conversation.push({ role, text }); }

function notifyCaregiver(state, reason) {
  const ev = addEvidence(state, {
    source: 'synthetic-care-circle', type: 'caregiver_notification',
    summary: `Caregiver notification confirmed: ${reason}`,
    data: { delivered: true, channel: 'simulated-notification' }
  });
  setNode(state, 'caregiver_notification', STATUS.CONFIRMED, ev.id, reason);
}

export function reconcile(state, command) {
  switch (command) {
    case 'CHECK_RIDE': return checkRide(state);
    case 'CONTINUE_BACKUP': return arrangeBackup(state);
    case 'VERIFY_PICKUP': return verifyPickup(state);
    case 'VERIFY_CLINIC': return verifyClinicArrival(state);
    case 'RETURN_EXCEPTION': return returnException(state);
    case 'RESOLVE_RETURN': return resolveReturn(state);
    case 'CONFIRM_HOME': return confirmHome(state);
    case 'RESET': return createInitialState();
    default: throw new Error(`Unknown command: ${command}`);
  }
}

function checkRide(state) {
  requireStatus(state, 'transport_request', STATUS.PENDING, 'Ride check is only valid before the outbound transport is resolved.');
  const attempted = addEvidence(state, {
    source: 'care-route-engine', type: 'provider_check_attempt', summary: 'Primary transport adapter queried for pickup status.', data: { adapter: 'primary-nemt-sim' }
  });
  setNode(state, 'transport_request', STATUS.ATTEMPTED, attempted.id, 'Pickup verification attempted.');

  const result = syntheticTransportAdapters.primaryRide.checkPickup();
  const failed = addEvidence(state, result.evidence);
  setNode(state, 'transport_request', STATUS.FAILED, failed.id, 'Primary pickup not verified inside the policy window.');
  state.in_transit.status = STATUS.BLOCKED;
  state.clinic_arrival.status = STATUS.BLOCKED;
  notifyCaregiver(state, 'Primary ride is late; backup workflow is awaiting patient approval.');
  state.nextAction = 'CONTINUE_BACKUP';
  state.lastExplanation = {
    action: 'Start approved backup transportation workflow',
    why: 'The scheduled ride was checked and pickup was not confirmed. Downstream travel remains blocked.',
    evidence: [failed.summary],
    unresolved: ['No outbound ride is currently confirmed.', 'Clinic arrival cannot be marked complete.']
  };
  say(state, 'alexa', 'Your scheduled vehicle has not arrived. I verified that pickup has not completed. I can start the approved backup transportation workflow. Your caregiver has been informed of the delay.');
  return state;
}

function arrangeBackup(state) {
  requireStatus(state, 'transport_request', STATUS.FAILED, 'Backup transport requires a verified failure of the primary ride.');
  const result = syntheticTransportAdapters.backupRide.arrange();
  const ev = addEvidence(state, result.evidence);
  setNode(state, 'transport_request', STATUS.CONFIRMED, ev.id, 'Backup ride BR-2048 confirmed.');
  state.pickup.status = STATUS.PENDING;
  state.in_transit.status = STATUS.BLOCKED;
  state.nextAction = 'VERIFY_PICKUP';
  state.lastExplanation = {
    action: 'Wait for pickup confirmation',
    why: 'A backup ride exists, but booking confirmation is not the same as physical pickup.',
    evidence: [ev.summary],
    unresolved: ['Pickup has not yet been independently confirmed.']
  };
  say(state, 'alexa', 'Your replacement ride is confirmed for approximately 7:41 AM. I will not mark pickup or clinic arrival complete until separate confirmation is received.');
  return state;
}

function verifyPickup(state) {
  requireStatus(state, 'transport_request', STATUS.CONFIRMED, 'Pickup cannot be confirmed without a confirmed transport request.');
  requireStatus(state, 'pickup', STATUS.PENDING, 'Pickup is not currently awaiting confirmation.');
  const ev = addEvidence(state, {
    source: 'synthetic-pickup-sensor', type: 'pickup_confirmation',
    summary: 'Synthetic pickup confirmation received for backup booking BR-2048.', data: { bookingId: 'BR-2048', pickupAt: '07:42' }
  });
  setNode(state, 'pickup', STATUS.CONFIRMED, ev.id, 'Patient pickup verified at 7:42 AM.');
  setNode(state, 'in_transit', STATUS.CONFIRMED, ev.id, 'Outbound transit is now active based on pickup evidence.');
  state.nextAction = 'VERIFY_CLINIC';
  state.lastExplanation = {
    action: 'Verify clinic arrival',
    why: 'Pickup is confirmed, so transit may continue; clinic arrival is still a separate handoff.',
    evidence: [ev.summary],
    unresolved: ['Clinic arrival remains unconfirmed.']
  };
  say(state, 'alexa', 'Pickup is confirmed. You are now in transit. I am still keeping clinic arrival unresolved until an arrival confirmation is received.');
  return state;
}

function verifyClinicArrival(state) {
  requireStatus(state, 'in_transit', STATUS.CONFIRMED, 'Clinic arrival requires verified outbound transit.');
  const ev = addEvidence(state, {
    source: 'synthetic-clinic-checkin', type: 'arrival_confirmation',
    summary: 'Synthetic clinic check-in confirms arrival at 8:03 AM.', data: { arrivalAt: '08:03', checkInConfirmed: true }
  });
  setNode(state, 'clinic_arrival', STATUS.CONFIRMED, ev.id, 'Clinic arrival verified.');
  setNode(state, 'treatment_handoff', STATUS.COMPLETED, ev.id, 'Non-clinical appointment handoff completed; no treatment decision is represented.');
  state.return_trip.status = STATUS.PENDING;
  notifyCaregiver(state, 'Clinic arrival is verified.');
  state.nextAction = 'RETURN_EXCEPTION';
  state.lastExplanation = {
    action: 'Monitor return transportation',
    why: 'The outbound journey is complete, but the return leg is a new handoff that must be verified independently.',
    evidence: [ev.summary],
    unresolved: ['Return transportation has not yet completed.']
  };
  say(state, 'alexa', 'Clinic arrival is verified at 8:03 AM, and your caregiver received confirmation. The return trip remains a separate journey state and will be verified later.');
  return state;
}

function returnException(state) {
  requireStatus(state, 'clinic_arrival', STATUS.CONFIRMED, 'Return trip cannot begin before clinic arrival is confirmed.');
  requireStatus(state, 'return_trip', STATUS.PENDING, 'Return trip is not pending.');
  const attempt = addEvidence(state, {
    source: 'care-route-engine', type: 'return_provider_check_attempt', summary: 'Return transport adapter queried after the expected pickup window.', data: { adapter: 'return-nemt-sim' }
  });
  setNode(state, 'return_trip', STATUS.ATTEMPTED, attempt.id, 'Return pickup check attempted.');
  const result = syntheticTransportAdapters.returnRide.check();
  const ev = addEvidence(state, result.evidence);
  setNode(state, 'return_trip', STATUS.FAILED, ev.id, 'Return pickup is not confirmed.');
  const esc = addEvidence(state, {
    source: 'predefined-escalation-policy', type: 'human_review_required',
    summary: 'Policy routes the unresolved return-trip exception to the authorized caregiver and transport contact for human review.',
    data: { diagnosis: false, emergencyDetermination: false, nextContacts: ['caregiver', 'transport-contact'] }
  });
  setNode(state, 'escalation_state', STATUS.NEEDS_REVIEW, esc.id, 'Human review required for unresolved return transportation.');
  state.home_arrival.status = STATUS.BLOCKED;
  notifyCaregiver(state, 'Return pickup remains unconfirmed; human review is requested.');
  state.nextAction = 'RESOLVE_RETURN';
  state.lastExplanation = {
    action: 'Escalate unresolved return transportation',
    why: 'A dispatch attempt exists, but no pickup evidence exists. The system fails closed rather than treating dispatch as completion.',
    evidence: [ev.summary, esc.summary],
    unresolved: ['Patient has not been verified in a return vehicle.', 'Home arrival is blocked.', 'Human review is active.']
  };
  say(state, 'alexa', 'The return ride was dispatched, but pickup was never confirmed. I am not treating that as success. Home arrival remains blocked, and the predefined policy is escalating to your authorized caregiver and transport contact for human review.');
  return state;
}

function resolveReturn(state) {
  requireStatus(state, 'return_trip', STATUS.FAILED, 'Alternate return requires a verified return-trip failure.');
  requireStatus(state, 'escalation_state', STATUS.NEEDS_REVIEW, 'Alternate return requires active human review.');
  const result = syntheticTransportAdapters.caregiverRide.arrange();
  const ev = addEvidence(state, result.evidence);
  setNode(state, 'return_trip', STATUS.CONFIRMED, ev.id, 'Approved alternate return ride confirmed.');
  const review = addEvidence(state, {
    source: 'synthetic-human-review', type: 'human_review_resolution', summary: 'Human review acknowledged the alternate return plan.', data: { approved: true }
  });
  setNode(state, 'escalation_state', STATUS.COMPLETED, review.id, 'Human review completed for return exception.');
  state.home_arrival.status = STATUS.PENDING;
  state.nextAction = 'CONFIRM_HOME';
  state.lastExplanation = {
    action: 'Verify home arrival',
    why: 'An alternate return ride is confirmed, but transportation confirmation is not the same as home arrival.',
    evidence: [ev.summary, review.summary],
    unresolved: ['Home arrival still requires evidence.']
  };
  say(state, 'alexa', 'The approved alternate return ride is confirmed after human review. I will keep home arrival unresolved until a separate arrival confirmation is received.');
  return state;
}

function confirmHome(state) {
  requireStatus(state, 'return_trip', STATUS.CONFIRMED, 'Home arrival requires confirmed return transportation.');
  requireStatus(state, 'home_arrival', STATUS.PENDING, 'Home arrival is not awaiting confirmation.');
  const ev = addEvidence(state, {
    source: 'synthetic-arrival-confirmation', type: 'home_arrival_confirmation', summary: 'Synthetic home-arrival confirmation received.', data: { locationClass: 'home', confirmed: true }
  });
  setNode(state, 'home_arrival', STATUS.COMPLETED, ev.id, 'Home arrival verified; care journey closed.');
  state.nextAction = null;
  state.lastExplanation = {
    action: 'Journey complete',
    why: 'Every required handoff now has evidence, including the final home-arrival confirmation.',
    evidence: [ev.summary],
    unresolved: []
  };
  say(state, 'alexa', 'Home arrival is verified. The care journey is complete, and every required handoff has an evidence record.');
  return state;
}

export function interpretUtterance(text, state) {
  const normalized = text.trim().toLowerCase();
  if (/ride.*coming|where.*ride|dialysis.*ride/.test(normalized)) return 'CHECK_RIDE';
  if (/continue|backup|replacement/.test(normalized)) return state.nextAction === 'CONTINUE_BACKUP' ? 'CONTINUE_BACKUP' : state.nextAction;
  if (/pickup/.test(normalized)) return 'VERIFY_PICKUP';
  if (/clinic|arriv.*care/.test(normalized)) return 'VERIFY_CLINIC';
  if (/return.*problem|return.*ride|go home/.test(normalized)) return 'RETURN_EXCEPTION';
  if (/resolve|caregiver.*ride|alternate/.test(normalized)) return 'RESOLVE_RETURN';
  if (/home.*arriv|i am home|made it home/.test(normalized)) return 'CONFIRM_HOME';
  if (/what happened|why/.test(normalized)) return 'EXPLAIN';
  return state.nextAction || 'EXPLAIN';
}
