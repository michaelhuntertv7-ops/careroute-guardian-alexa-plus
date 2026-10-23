import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reconcile, interpretUtterance, STATUS } from '../src/engine.js';

function advance(...commands) { let s=createInitialState(); for(const c of commands) s=reconcile(s,c); return s; }

test('initial scenario is synthetic and outbound transport is pending',()=>{const s=createInitialState();assert.equal(s.patient_context.synthetic,true);assert.equal(s.transport_request.status,STATUS.PENDING);});
test('appointment begins confirmed with evidence',()=>{const s=createInitialState();assert.equal(s.appointment.status,STATUS.CONFIRMED);assert.ok(s.appointment.evidenceIds.length>0);});
test('ride check records attempted then failed',()=>{const s=advance('CHECK_RIDE');assert.equal(s.transport_request.status,STATUS.FAILED);assert.ok(s.history.some(e=>e.status===STATUS.ATTEMPTED));assert.ok(s.history.some(e=>e.action==='transport_request'&&e.status===STATUS.FAILED));});
test('failed ride blocks downstream travel',()=>{const s=advance('CHECK_RIDE');assert.equal(s.in_transit.status,STATUS.BLOCKED);assert.equal(s.clinic_arrival.status,STATUS.BLOCKED);});
test('caregiver is notified on primary ride failure',()=>{const s=advance('CHECK_RIDE');assert.equal(s.caregiver_notification.status,STATUS.CONFIRMED);});
test('backup cannot start without verified primary failure',()=>{assert.throws(()=>reconcile(createInitialState(),'CONTINUE_BACKUP'),/verified failure/);});
test('backup booking confirmation does not auto-confirm pickup',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP');assert.equal(s.transport_request.status,STATUS.CONFIRMED);assert.equal(s.pickup.status,STATUS.PENDING);assert.equal(s.in_transit.status,STATUS.BLOCKED);});
test('pickup cannot verify before transport is confirmed',()=>{assert.throws(()=>reconcile(createInitialState(),'VERIFY_PICKUP'),/confirmed transport/);});
test('pickup evidence enables transit',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP');assert.equal(s.pickup.status,STATUS.CONFIRMED);assert.equal(s.in_transit.status,STATUS.CONFIRMED);});
test('clinic arrival cannot verify before transit',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP');assert.throws(()=>reconcile(s,'VERIFY_CLINIC'),/verified outbound transit/);});
test('clinic arrival and non-clinical handoff are evidence-backed',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC');assert.equal(s.clinic_arrival.status,STATUS.CONFIRMED);assert.equal(s.treatment_handoff.status,STATUS.COMPLETED);assert.ok(s.treatment_handoff.evidenceIds.length>0);});
test('return trip stays separate from outbound completion',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC');assert.equal(s.return_trip.status,STATUS.PENDING);});
test('return exception ends in failed not completed',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION');assert.equal(s.return_trip.status,STATUS.FAILED);});
test('return failure activates human review',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION');assert.equal(s.escalation_state.status,STATUS.NEEDS_REVIEW);});
test('return failure blocks home arrival',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION');assert.equal(s.home_arrival.status,STATUS.BLOCKED);});
test('return resolution requires human review state',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION');s.escalation_state.status=STATUS.PENDING;assert.throws(()=>reconcile(s,'RESOLVE_RETURN'),/human review/);});
test('alternate return confirmation does not auto-complete home arrival',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION','RESOLVE_RETURN');assert.equal(s.return_trip.status,STATUS.CONFIRMED);assert.equal(s.home_arrival.status,STATUS.PENDING);});
test('home arrival can complete only after return transport confirmation',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION','RESOLVE_RETURN','CONFIRM_HOME');assert.equal(s.home_arrival.status,STATUS.COMPLETED);assert.equal(s.nextAction,null);});
test('every confirmed/completed/failed transition in history carries evidence',()=>{const s=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP','VERIFY_CLINIC','RETURN_EXCEPTION','RESOLVE_RETURN','CONFIRM_HOME');for(const e of s.history.filter(x=>[STATUS.CONFIRMED,STATUS.COMPLETED,STATUS.FAILED].includes(x.status))) assert.ok(e.evidenceId,JSON.stringify(e));});
test('wellness context explicitly has no interpretation',()=>{const s=createInitialState();assert.equal(s.wellness_context.interpretation,'none');assert.match(s.wellness_context.boundary,/No diagnosis/);});
test('utterance parser maps ride question to CHECK_RIDE',()=>{const s=createInitialState();assert.equal(interpretUtterance('Alexa, is my dialysis ride coming?',s),'CHECK_RIDE');});
test('utterance parser maps why to EXPLAIN',()=>{const s=createInitialState();assert.equal(interpretUtterance('Alexa, why?',s),'EXPLAIN');});
test('evidence ids are deterministic and unique',()=>{const s=advance('CHECK_RIDE');const ids=s.evidence.map(e=>e.id);assert.deepEqual(ids,[...new Set(ids)]);assert.equal(ids[0],'EV-001');});
test('journey audit history is deterministic across identical runs',()=>{const a=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP');const b=advance('CHECK_RIDE','CONTINUE_BACKUP','VERIFY_PICKUP');assert.deepEqual(a.history,b.history);assert.deepEqual(a.evidence,b.evidence);});
