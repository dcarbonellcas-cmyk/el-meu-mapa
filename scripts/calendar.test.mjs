import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const context=vm.createContext({Date,Intl});
for (const name of ['renovacions','calendar','calendar-gmail']) {
  const source=await readFile(new URL('../assets/js/'+name+'.js',import.meta.url),'utf8');
  vm.runInContext(source.split('\n(() => {')[0],context);
}

const sent=(date)=>({type:'sent',date});
const place={name:'Centre de prova'};
const renewal=(history,status='sent',months)=>context.applicationCalendarEvents(place,history,status,months).find(event=>event.type==='renewal')?.date;
test('calendar uses the Madrid date and clamps the following month',()=>{
  const history=[sent('2027-01-30T23:30:00Z')];
  assert.equal(context.applicationCalendarEvents(place,history,'sent')[0].date,'2027-01-31');
  assert.equal(renewal(history),'2027-02-28');
});
test('three months crosses the year and clamps to the final day',()=>{
  assert.equal(renewal([sent('2026-11-30T15:00:00Z')],'sent',3),'2027-02-28');
});
test('only the latest confirmed send produces a reminder, even if a new draft exists',()=>{
  const history=[sent('2027-01-03T10:00:00Z'),sent('2027-01-20T10:00:00Z'),{type:'prepared',date:'2027-01-21T10:00:00Z'}];
  assert.equal(renewal(history,'prepared'),'2027-02-20');
});
test('a response to the latest send stops renewal; a reply to an older thread does not',()=>{
  const old=sent('2027-01-03T10:00:00Z'), current=sent('2027-01-20T10:00:00Z');
  const reply={type:'replied',date:'2027-01-22T10:00:00Z'};
  assert.equal(renewal([old,current,{...reply,applicationSentAt:current.date}],'replied'),undefined);
  assert.equal(renewal([old,current,{...reply,applicationSentAt:old.date}],'replied'),'2027-02-20');
});
test('Gmail filters out automatic acknowledgements and unlinked senders',()=>{
  const from={name:'From',value:'School <school@example.com>'};
  const message=(headers)=>({labelIds:['INBOX'],payload:{headers}});
  assert.equal(context.calendarGmailReply(message([from]),['school@example.com']),true);
  assert.equal(context.calendarGmailReply(message([from,{name:'Auto-Submitted',value:'auto-replied'}]),['school@example.com']),false);
  assert.equal(context.calendarGmailReply(message([from]),['other@example.com']),false);
});
