import test from 'node:test';import assert from 'node:assert/strict';
import {visibleProcess,publishCandidateUpdate,overdueUpdates} from '../src/process.js';
const p={id:'demo',title:'Fiktiv teststilling',overallStage:'offer',recruiterIds:['r'],customerIds:['c'],internalNotes:'PRIVATE',applications:[{id:'a1',candidateId:'one',stage:'references',internalAssessment:'PRIVATE',customerRelease:{approved:true,name:'Fiktiv A',summary:'Godkjent sammendrag'},publishedUpdate:{stage:'interview',message:'Intervju gjennomført. Vi avklarer neste steg.',nextUpdateAt:'2026-11-20T12:00:00Z',publishedBy:'r'}},{id:'a2',candidateId:'two',stage:'review',customerRelease:{approved:false,name:'HIDDEN'}}]};

test('candidate sees the role and only their published application update', () => {
  assert.deepEqual(visibleProcess(p, { id: 'one' }), {
    id: 'demo',
    title: 'Fiktiv teststilling',
    application: {
      id: 'a1',
      stage: 'interview',
      message: 'Intervju gjennomført. Vi avklarer neste steg.',
      nextUpdateAt: '2026-11-20T12:00:00Z',
    },
  });
});

test('candidate without a published update sees the receipt confirmation', () => {
  assert.deepEqual(visibleProcess(p, { id: 'two' }), {
    id: 'demo',
    title: 'Fiktiv teststilling',
    application: {
      id: 'a2',
      stage: 'received',
      message: 'Søknaden er mottatt.',
      nextUpdateAt: null,
    },
  });
});
test('customer sees only approved summary fields, and older releases have no stage', () => {
  const view = visibleProcess(p, { id: 'c' });
  assert.deepEqual(view.applications, [
    { id: 'a1', name: 'Fiktiv A', stage: null, summary: 'Godkjent sammendrag' },
  ]);
});

test('customer stage stays at the approved value when the internal stage changes', () => {
  const [approved, unapproved] = p.applications;
  const released = {
    ...p,
    applications: [
      {
        ...approved,
        stage: 'review',
        customerRelease: { ...approved.customerRelease, stage: 'review', internalNote: 'PRIVATE' },
      },
      unapproved,
    ],
  };
  const moved = {
    ...released,
    applications: [{ ...released.applications[0], stage: 'references' }, unapproved],
  };
  const expected = [{ id: 'a1', name: 'Fiktiv A', stage: 'review', summary: 'Godkjent sammendrag' }];
  assert.deepEqual(visibleProcess(released, { id: 'c' }).applications, expected);
  assert.deepEqual(visibleProcess(moved, { id: 'c' }).applications, expected);
  assert.equal(visibleProcess(moved, { id: 'r' }).applications[0].stage, 'references');
});

test('customer sees no stage when the approved snapshot has an unsupported value', () => {
  const [approved] = p.applications;
  const process = {
    ...p,
    applications: [{ ...approved, customerRelease: { ...approved.customerRelease, stage: 'private' } }],
  };
  assert.equal(visibleProcess(process, { id: 'c' }).applications[0].stage, null);
});

test('customer approval does not grant another customer access to the process', () => {
  const otherProcess = { ...p, id: 'other', customerIds: ['other-customer'] };
  assert.equal(visibleProcess(otherProcess, { id: 'other-customer' }).id, 'other');
  assert.throws(() => visibleProcess(p, { id: 'other-customer' }), /Access denied/);
  assert.throws(() => visibleProcess(otherProcess, { id: 'c' }), /Access denied/);
});
test('unknown, anonymous and self-declared recruiter are denied',()=>{for(const viewer of [null,{id:'stranger'},{id:'stranger',role:'recruiter'}])assert.throws(()=>visibleProcess(p,viewer),/Access denied/);});
test('publication requires assigned recruiter, explicit text and future followup',()=>{assert.throws(()=>publishCandidateUpdate(p,'c','a1',{},'2026-11-14T12:00:00Z'),/Access denied/);assert.throws(()=>publishCandidateUpdate(p,'r','a1',{stage:'review',message:'',nextUpdateAt:'2026-11-20'},'2026-11-14'),/Invalid update/);const next=publishCandidateUpdate(p,'r','a1',{stage:'interview',message:'Ny avtalt oppfølging',nextUpdateAt:'2026-11-23T12:00:00Z'},'2026-11-14T12:00:00Z');assert.equal(next.applications[0].publishedUpdate.message,'Ny avtalt oppfølging');assert.notEqual(p.applications[0].publishedUpdate.message,'Ny avtalt oppfølging');});
test('overdue promise becomes action for recruiter, no invented progress',()=>{assert.deepEqual(overdueUpdates(p,'2026-11-21T12:00:00Z').map(x=>x.applicationId),['a1']);assert.equal(p.applications[0].publishedUpdate.stage,'interview');});
