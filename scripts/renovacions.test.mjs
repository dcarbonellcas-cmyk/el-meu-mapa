import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context=vm.createContext({Date});
const awaitedSource=await readFile(new URL('../assets/js/renovacions.js',import.meta.url),'utf8');
vm.runInContext(awaitedSource,context);
function parts(value){const d=context.nextRenewalDate(value);return d?[d.getFullYear(),d.getMonth()+1,d.getDate()]:null}
test('reminder after exactly one calendar month',()=>assert.deepEqual(parts(new Date(2026,9,3,12)),[2026,11,3]));
test('month end clamps instead of skipping February',()=>assert.deepEqual(parts(new Date(2026,0,31,12)),[2026,2,28]));
test('leap year preserves February 29',()=>assert.deepEqual(parts(new Date(2028,0,31,12)),[2028,2,29]));
test('December rolls into the next year',()=>assert.deepEqual(parts(new Date(2026,11,31,12)),[2027,1,31]));
test('invalid date does not invent a deadline',()=>assert.equal(context.nextRenewalDate('invalid'),null));

const sent=date=>({type:'sent',date,text:'Confirmed application'});
const tracking=(history,status,now,interviews=[])=>context.candidatureTracking(history,status,{now:new Date(now),interviews});
test('a sent application moves to renewal at one Madrid calendar month and a resend restarts the period',()=>{
 assert.equal(tracking([sent('2026-10-13T10:00:00Z')],'sent','2026-11-12T12:00:00Z').bucket,'sent');
 assert.equal(tracking([sent('2026-10-13T10:00:00Z')],'sent','2026-11-13T12:00:00Z').bucket,'renew');
 assert.equal(tracking([sent('2026-11-12T10:00:00Z'),sent('2026-10-13T10:00:00Z')],'sent','2026-11-13T12:00:00Z').bucket,'sent');
});
test('unsent drafts and portal accounts never invent an application or renewal date',()=>{
 assert.equal(tracking([{type:'prepared',date:'2026-10-01T10:00:00Z'}],'prepared','2026-11-13T12:00:00Z').bucket,'unsent');
 const result=tracking([],'sent','2026-11-13T12:00:00Z');assert.equal(result.bucket,'sent');assert.equal(result.dueDay,null);
});
test('human replies, interviews, rejections and failed delivery stop automatic monthly renewal',()=>{
 for(const type of ['replied','interview','rejected','delivery_failed']){
  assert.equal(tracking([sent('2026-10-01T10:00:00Z'),{type,date:'2026-10-02T10:00:00Z'}],'sent','2026-11-13T12:00:00Z').bucket,'sent');
 }
});
test('a reply to an older application does not resolve the latest send',()=>{
 const result=tracking([sent('2026-10-01T10:00:00Z'),{type:'replied',date:'2026-10-02T10:00:00Z',applicationSentAt:'2026-09-01T10:00:00Z'}],'sent','2026-11-13T12:00:00Z');assert.equal(result.bucket,'renew');
});
test('known interview follow-ups respect September 2027 and a real resend restarts the monthly period',()=>{
 const interview={type:'interview',reminderMonth:'2027-09'};
 assert.equal(tracking([sent('2026-11-01T10:00:00Z')],'sent','2027-08-31T12:00:00Z',[interview]).bucket,'sent');
 assert.equal(tracking([sent('2026-11-01T10:00:00Z')],'sent','2027-09-01T12:00:00Z',[interview]).bucket,'renew');
 assert.equal(tracking([sent('2027-09-02T10:00:00Z')],'sent','2027-09-03T12:00:00Z',[interview]).bucket,'sent');
 assert.equal(tracking([sent('2027-09-02T10:00:00Z')],'sent','2027-10-03T12:00:00Z',[interview]).bucket,'renew');
});
test('the renewal month clamps January 31 in Madrid instead of skipping February',()=>{
 const result=tracking([sent('2027-01-30T23:30:00Z')],'sent','2027-02-28T12:00:00Z');assert.equal(result.dueDay,'2027-02-28');assert.equal(result.bucket,'renew');
});
test('shared FEP/FECC portal retains history stored with the older network identifier',()=>{
 const rows={xarxa_fep:[sent('2026-10-01T10:00:00Z')],calendar_interviews:[]};
 const c=vm.createContext({Date,hist:id=>rows[id]||[],state:()=> 'none'});
 vm.runInContext(awaitedSource,c);
 assert.equal(c.trackingForPlace({id:'xarxa_fecc',name:'Shared board'},new Date('2026-11-13T12:00:00Z')).bucket,'renew');
});
