// Domain contract only. Caller identities must come from a verified server session.
// This module is not authentication, RLS, a public API or a notification sender.
export const stages=['received','review','interview','references','offer','closed'];
export function visibleProcess(process,viewer){
 if(!viewer?.id)throw new Error('Access denied');
 const recruiter=process.recruiterIds.includes(viewer.id);
 const customer=process.customerIds.includes(viewer.id);
 const application=process.applications.find(a=>a.candidateId===viewer.id);
 if(!recruiter&&!customer&&!application)throw new Error('Access denied');
 const common={id:process.id,title:process.title,overallStage:process.overallStage};
 if(recruiter)return {...common,applications:process.applications.map(a=>({...a})),internalNotes:process.internalNotes};
 if(customer)return {...common,applications:process.applications.filter(a=>a.customerRelease?.approved===true).map(a=>({id:a.id,name:a.customerRelease.name,stage:a.stage,summary:a.customerRelease.summary})),nextAction:process.customerNextAction};
 const update = application.publishedUpdate;
 return {
   id: process.id,
   title: process.title,
   application: {
     id: application.id,
     stage: update?.stage ?? 'received',
     message: update?.message ?? 'Søknaden er mottatt.',
     nextUpdateAt: update?.nextUpdateAt ?? null,
   },
 };
}
export function publishCandidateUpdate(process,actorId,applicationId,update,now){
 if(!process.recruiterIds.includes(actorId))throw new Error('Access denied');
 if(!stages.includes(update.stage)||typeof update.message!=='string'||!update.message.trim()||update.message.length>2000)throw new Error('Invalid update');
 if(!Number.isFinite(Date.parse(now))||!Number.isFinite(Date.parse(update.nextUpdateAt))||Date.parse(update.nextUpdateAt)<=Date.parse(now))throw new Error('Next update must be in the future');
 const application=process.applications.find(a=>a.id===applicationId);if(!application)throw new Error('Application not found');
 const event={stage:update.stage,message:update.message.trim(),nextUpdateAt:update.nextUpdateAt,publishedAt:now,publishedBy:actorId};
 return {...process,applications:process.applications.map(a=>a.id===applicationId?{...a,publishedUpdate:event}:a)};
}
export function overdueUpdates(process,now){
 return process.applications.filter(a=>a.publishedUpdate?.nextUpdateAt&&Date.parse(a.publishedUpdate.nextUpdateAt)<Date.parse(now)&&a.publishedUpdate.stage!=='closed').map(a=>({applicationId:a.id,dueAt:a.publishedUpdate.nextUpdateAt,action:'Rekrutterer må publisere en ny status eller endret dato.'}));
}
