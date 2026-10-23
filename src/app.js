import { createInitialState, interpretUtterance, reconcile, STATUS } from './engine.js';

const STORAGE_KEY = 'careroute-guardian-state-v1';
let state = loadState();

const timelineKeys = [
  ['transport_request', 'Outbound ride'], ['pickup', 'Pickup'], ['in_transit', 'Transit'],
  ['clinic_arrival', 'Clinic'], ['treatment_handoff', 'Handoff'], ['return_trip', 'Return ride'], ['home_arrival', 'Home']
];

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

  document.querySelector('#conversation').innerHTML = state.conversation.slice(-8).map(m => `<div class="bubble ${m.role}"><span>${m.role === 'alexa' ? 'Alexa+ simulation' : 'You'}</span><p>${escapeHtml(m.text)}</p></div>`).join('');
  const conv = document.querySelector('#conversation'); conv.scrollTop = conv.scrollHeight;

  document.querySelector('#evidence-list').innerHTML = state.evidence.slice().reverse().slice(0, 7).map(ev => `<article class="evidence-card"><header><span>${escapeHtml(ev.id)}</span><small>${escapeHtml(ev.type)}</small></header><p>${escapeHtml(ev.summary)}</p><footer>${escapeHtml(ev.source)}</footer></article>`).join('');

  document.querySelector('#unresolved-list').innerHTML = current.unresolved.length ? current.unresolved.map(x => `<li>${escapeHtml(x)}</li>`).join('') : '<li class="clear">No unresolved required handoffs.</li>';
  document.querySelector('#evidence-reason-list').innerHTML = current.evidence.map(x => `<li>${escapeHtml(x)}</li>`).join('');

  const cg = state.caregiver_notification;
  document.querySelector('#caregiver-status').innerHTML = `<span class="${statusClass(cg.status)}">${cg.status}</span><p>${escapeHtml(cg.detail || 'No notification sent yet.')}</p>`;
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
