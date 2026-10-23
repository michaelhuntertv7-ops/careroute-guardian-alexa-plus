import { createInitialState, interpretUtterance, reconcile, STATUS } from './engine.js';

const STORAGE_KEY = 'careroute-guardian-state-v1';
let state = loadState();
const params = new URLSearchParams(location.search);
const requestedStage = params.get('stage');
const requestedFocus = params.get('focus');
if (requestedStage) state = stateForStage(requestedStage);
if (requestedFocus) document.body.dataset.focus = requestedFocus;

const timelineKeys = [
  ['transport_request', 'Outbound ride'], ['pickup', 'Pickup'], ['in_transit', 'Transit'],
  ['clinic_arrival', 'Clinic'], ['treatment_handoff', 'Handoff'], ['return_trip', 'Return ride'], ['home_arrival', 'Home']
];

function stateForStage(stage) {
  const sequences = {
    start: [],
    'ride-failed': ['CHECK_RIDE'],
    'backup-confirmed': ['CHECK_RIDE','CONTINUE_BACKUP'],
    pickup: ['CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP'],
    clinic: ['CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC'],
    'return-exception': ['CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION'],
    'return-resolved': ['CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION','RESOLVE_RETURN'],
    home: ['CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION','RESOLVE_RETURN','CONFIRM_HOME']
  };
  let snapshot = createInitialState();
  for (const command of (sequences[stage] || [])) snapshot = reconcile(snapshot, command);
  return snapshot;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    return parsed?.schemaVersion === 1 ? parsed : createInitialState();
  } catch { return createInitialState(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function statusClass(status) { return `status status-${status.toLowerCase().replace('_','-')}`; }

function render() {
  document.querySelector('#timeline').innerHTML = timelineKeys.map(([key, label]) => {
    const item = state[key];
    return `<div class="timeline-item"><div class="timeline-marker ${statusClass(item.status)}"></div><div><strong>${label}</strong><span class="${statusClass(item.status)}">${item.status}</span><p>${escapeHtml(item.detail || '')}</p></div></div>`;
  }).join('');

  const current = state.lastExplanation;
  document.querySelector('#current-action').textContent = current.action;
  document.querySelector('#why-action').textContent = current.why;
  document.querySelector('#unresolved-count').textContent = String(current.unresolved.length);
  document.querySelector('#evidence-count').textContent = String(state.evidence.length);
  document.querySelector('#history-count').textContent = String(state.history.length);

  const human = humanSummary(state);
  document.querySelector('#human-status').textContent = human.title;
  document.querySelector('#human-detail').textContent = human.detail;
  document.querySelector('#ride-short').textContent = human.ride;
  document.querySelector('#clinic-short').textContent = human.clinic;
  document.querySelector('#return-short').textContent = human.returnTrip;
  document.querySelector('#home-short').textContent = human.home;
  document.querySelector('[data-key="transport"]').dataset.state = human.transportState;
  document.querySelector('[data-key="clinic"]').dataset.state = human.clinicState;
  document.querySelector('[data-key="return"]').dataset.state = human.returnState;
  document.querySelector('[data-key="home-end"]').dataset.state = human.homeState;

  document.querySelector('#conversation').innerHTML = state.conversation.slice(-8).map(m => `<div class="bubble ${m.role}"><span>${m.role === 'alexa' ? 'Alexa+ simulation' : 'You'}</span><p>${escapeHtml(m.text)}</p></div>`).join('');
  const conv = document.querySelector('#conversation'); conv.scrollTop = conv.scrollHeight;

  document.querySelector('#evidence-list').innerHTML = state.evidence.slice().reverse().slice(0, 7).map(ev => `<article class="evidence-card"><header><span>${escapeHtml(ev.id)}</span><small>${escapeHtml(ev.type)}</small></header><p>${escapeHtml(ev.summary)}</p><footer>${escapeHtml(ev.source)}</footer></article>`).join('');

  document.querySelector('#unresolved-list').innerHTML = current.unresolved.length ? current.unresolved.map(x => `<li>${escapeHtml(x)}</li>`).join('') : '<li class="clear">No unresolved required handoffs.</li>';
  document.querySelector('#evidence-reason-list').innerHTML = current.evidence.map(x => `<li>${escapeHtml(x)}</li>`).join('');

  const cg = state.caregiver_notification;
  const caregiverHuman = cg.status === STATUS.CONFIRMED
    ? `<div class="caregiver-human"><strong>Caregiver update sent</strong><span>${escapeHtml(cg.detail || 'The authorized caregiver received the latest journey update.')}</span></div>`
    : `<p>${escapeHtml(cg.detail || 'No notification sent yet.')}</p>`;
  document.querySelector('#caregiver-status').innerHTML = `<span class="${statusClass(cg.status)}">${cg.status}</span>${caregiverHuman}`;
  const es = state.escalation_state;
  document.querySelector('#escalation-status').innerHTML = `<span class="${statusClass(es.status)}">${es.status}</span><p>${escapeHtml(es.detail || 'No active escalation.')}</p>`;

  document.querySelector('#wellness-list').innerHTML = state.wellness_context.signals.map(s => `<div><span>${escapeHtml(s.label)}</span><strong>${escapeHtml(s.value)}</strong></div>`).join('');
  document.querySelector('#wellness-boundary').textContent = state.wellness_context.boundary;

  const nextButton = document.querySelector('#next-action');
  nextButton.textContent = nextLabel(state.nextAction);
  nextButton.disabled = !state.nextAction;
  document.querySelector('#next-code').textContent = state.nextAction || 'COMPLETE';

  const journeyComplete = state.home_arrival.status === STATUS.COMPLETED;
  document.body.dataset.complete = String(journeyComplete);
}

function humanSummary(s) {
  const failedOutbound = s.transport_request.status === STATUS.FAILED;
  const pickupDone = [STATUS.CONFIRMED, STATUS.COMPLETED].includes(s.pickup.status);
  const clinicDone = [STATUS.CONFIRMED, STATUS.COMPLETED].includes(s.clinic_arrival.status);
  const returnFailed = [STATUS.FAILED, STATUS.NEEDS_REVIEW].includes(s.return_trip.status) || s.escalation_state.status === STATUS.NEEDS_REVIEW;
  const homeDone = s.home_arrival.status === STATUS.COMPLETED;
  let title = 'Checking whether Maria’s scheduled ride actually arrived.';
  let detail = 'The appointment is confirmed, but pickup still needs evidence.';
  if (failedOutbound && !pickupDone) { title = 'Maria’s scheduled ride did not arrive. CareRoute is recovering the trip.'; detail = 'The failed ride stays failed; a backup can be arranged and the caregiver can be informed without pretending pickup happened.'; }
  if (s.transport_request.status === STATUS.CONFIRMED && !pickupDone) { title = 'A replacement ride is confirmed — but Maria has not been marked picked up.'; detail = 'CareRoute separates “ride booked” from “patient picked up” and waits for real pickup confirmation.'; }
  if (pickupDone && !clinicDone) { title = 'Maria is in transit. Clinic arrival is still open.'; detail = 'The ride handoff is verified, but CareRoute will not close the clinic step until arrival is confirmed.'; }
  if (clinicDone && !returnFailed) { title = 'Maria reached the clinic. The outbound care journey is verified.'; detail = 'Her caregiver has confirmation; the return trip remains a separate handoff to verify later.'; }
  if (returnFailed && !homeDone) { title = 'The return ride hit an exception. Home arrival remains unresolved.'; detail = 'CareRoute keeps the failed return handoff visible and routes the case to the approved human-review path.'; }
  if (homeDone) { title = 'Maria is home. Every required handoff is complete.'; detail = 'The journey closed only after evidence supported the final home-arrival confirmation.'; }
  return {
    title, detail,
    ride: failedOutbound && !pickupDone ? 'Scheduled ride failed' : pickupDone ? 'Pickup verified' : s.transport_request.status === STATUS.CONFIRMED ? 'Backup confirmed' : 'Waiting',
    clinic: clinicDone ? 'Arrival verified' : 'Not yet verified',
    returnTrip: returnFailed ? 'Exception — human review' : s.return_trip.status === STATUS.COMPLETED ? 'Completed' : 'Not started',
    home: homeDone ? 'Arrival verified' : 'Not yet verified',
    transportState: failedOutbound && !pickupDone ? 'bad' : pickupDone || s.transport_request.status === STATUS.CONFIRMED ? 'good' : '',
    clinicState: clinicDone ? 'good' : '',
    returnState: returnFailed ? 'review' : s.return_trip.status === STATUS.COMPLETED ? 'good' : '',
    homeState: homeDone ? 'good' : ''
  };
}

function nextLabel(action) {
  return ({CHECK_RIDE:'Check scheduled ride',CONTINUE_BACKUP:'Continue with backup',VERIFY_PICKUP:'Verify pickup',VERIFY_CLINIC:'Verify clinic arrival',RETURN_EXCEPTION:'Simulate return exception',RESOLVE_RETURN:'Resolve with human review',CONFIRM_HOME:'Confirm home arrival'})[action] || 'Journey complete';
}

function perform(command, userText) {
  if (command === 'EXPLAIN') {
    state.conversation.push({ role: 'user', text: userText || 'Why?' });
    state.conversation.push({ role: 'alexa', text: `${state.lastExplanation.why} ${state.lastExplanation.unresolved.length ? 'Still unresolved: ' + state.lastExplanation.unresolved.join(' ') : 'No required handoffs remain unresolved.'}` });
    saveState(); render(); return;
  }
  try {
    if (userText) state.conversation.push({ role: 'user', text: userText });
    state = reconcile(state, command);
  } catch (error) {
    state.conversation.push({ role: 'alexa', text: `I cannot do that yet. ${error.message}` });
  }
  saveState(); render();
}

document.querySelector('#next-action').addEventListener('click', () => perform(state.nextAction, nextSpoken(state.nextAction)));
document.querySelector('#reset').addEventListener('click', () => { state = createInitialState(); saveState(); render(); });
document.querySelector('#run-demo').addEventListener('click', async () => {
  const order = ['CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION'];
  state = createInitialState(); render();
  for (const command of order) { await new Promise(r => setTimeout(r, 520)); perform(command, nextSpoken(command)); }
});
document.querySelector('#utterance-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.querySelector('#utterance');
  const text = input.value.trim(); if (!text) return;
  perform(interpretUtterance(text, state), text); input.value = '';
});
document.querySelectorAll('[data-utterance]').forEach(btn => btn.addEventListener('click', () => {
  const text = btn.dataset.utterance; perform(interpretUtterance(text, state), text);
}));

function nextSpoken(action) {
  return ({CHECK_RIDE:'Alexa, is my dialysis ride coming?',CONTINUE_BACKUP:'Alexa, continue.',VERIFY_PICKUP:'Alexa, verify pickup.',VERIFY_CLINIC:'Alexa, confirm clinic arrival.',RETURN_EXCEPTION:'Alexa, what is happening with my return ride?',RESOLVE_RETURN:'Alexa, resolve the return trip with the approved backup.',CONFIRM_HOME:'Alexa, I made it home.'})[action] || 'Alexa, continue.';
}

render();
if (new URLSearchParams(location.search).get('focus') === 'proof') {
  requestAnimationFrame(() => document.querySelector('#proof')?.scrollIntoView({ block: 'start' }));
}
