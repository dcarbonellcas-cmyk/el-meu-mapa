import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const context=vm.createContext({Date,Intl});
for (const name of ['calendar','calendar-gmail']) {
  const source=await readFile(new URL('../assets/js/'+name+'.js',import.meta.url),'utf8');
  vm.runInContext(source.split('\n(() => {')[0],context);
}

const sent=(date)=>({type:'sent',date});
const place={name:'Centre de prova'};
const renewal=(history,status='sent')=>context.applicationCalendarEvents(place,history,status).find(event=>event.type==='renewal')?.date;
test('calendar uses the Madrid date and clamps the following month',()=>{
  const history=[sent('2027-01-30T23:30:00Z')];
  assert.equal(context.applicationCalendarEvents(place,history,'sent')[0].date,'2027-01-31');
  assert.equal(renewal(history),'2027-02-28');
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


test('month-only follow-ups remain in their month without inventing a day',()=>{
  const interviews=[{text:'School A',reminderMonth:'2027-09'},{text:'School B',reminderMonth:'2027-09'},{text:'School C',outcome:'pending'}];
  const result=context.calendarMonthFollowUps(interviews,'2027-09');
  assert.equal(result.length,2);
  assert(result.every(item=>!Object.hasOwn(item,'date')));
  assert.equal(context.calendarMonthFollowUps(interviews,'2027-08').length,0);
  assert.equal(context.calendarMonthFollowUps(interviews,'2027-13').length,0);
});

const data={centres:[{id:'a',name:'Escola Compartida',city:'A'},{id:'b',name:'Escola Compartida',city:'B'}],entitats:{infantil:[],lleure:[]}};
const sources=(histories={},index=[],portals=[],legacy=[],statuses={})=>context.calendarApplicationSources(data,histories,index,portals,legacy,statuses);
test('calendar includes Gmail imports and deduplicates a send already present in centre history',()=>{
 const item={gmailId:'abcdef1234567890',placeId:'a',date:'2026-11-12T10:00:00Z',threadId:'abcdef1234567890'};
 const events=sources({a:[{...item,type:'sent'}]},[item]).events.filter(x=>x.type==='sent');
 assert.equal(events.length,1);assert.equal(events[0].date,'2026-11-12');assert.equal(events[0].threadId,item.threadId);
});
test('same-named schools and two distinct real emails on one day remain separate',()=>{
 const a={type:'sent',date:'2026-11-12T10:00:00Z',gmailId:'aaaa'},b={...a,gmailId:'bbbb'};
 const events=sources({a:[a,b],b:[a]}).events.filter(x=>x.type==='sent');
 assert.equal(events.length,3);assert.equal(new Set(events.map(x=>x.id)).size,3);
});
test('calendar retains confirmed portal sends but never counts registration or preparation as a send',()=>{
 const events=sources({portal:[{type:'sent',date:'2026-11-12T10:00:00Z'}],a:[{type:'prepared',date:'2026-11-12T10:00:00Z'}]},[],[{id:'portal',name:'Borsa de prova',status:'registered'},{id:'registeredOnly',name:'Només inscripció',status:'registered'}]).events;
 assert.equal(events.filter(x=>x.type==='sent').length,1);assert.equal(events[0].placeName,'Borsa de prova');
});
test('an unlinked Gmail record retains its source name and date and has no guessed renewal',()=>{
 const result=sources({},[{gmailId:'abcd',placeId:null,placeName:'Nom verificat al correu',date:'2026-11-12T23:30:00Z'}]);
 assert.equal(result.events.length,1);assert.equal(result.events[0].placeName,'Nom verificat al correu');assert.equal(result.events[0].date,'2026-11-13');
});
test('an unlinked Gmail import reuses an existing linked send instead of creating a duplicate',()=>{
 const item={gmailId:'abcd',date:'2026-11-12T10:00:00Z'};
 assert.equal(sources({a:[{...item,type:'sent'}]},[{...item,placeId:null}]).events.filter(x=>x.type==='sent').length,1);
});
test('old dated sends are included once while undated sent statuses never receive an invented date',()=>{
 const result=sources({a:[{type:'sent',date:'2026-11-12T10:00:00Z'}]},[],[],[{name:'Escola Compartida',matchedId:'a',sentDate:'2026-11-12'},{name:'Centre antic',sentDate:'2026-09-04'}],{b:'sent'});
 assert.equal(result.events.filter(x=>x.type==='sent').length,2);assert.equal(result.undated,1);
});

test('Gmail import retains verified names and thread links without replacing centre history',async()=>{
 const source=await readFile(new URL('../assets/js/candidatures.js',import.meta.url),'utf8');
 const ctx=vm.createContext({Date,Map,Set});vm.runInContext(source.split('\n(function(){')[0],ctx);
 const row={gmailId:'abcdef1234567890',date:'2026-11-12T10:00:00Z',placeId:'a',placeName:'Nom verificat',threadId:'1234567890abcdef'};
 const snapshot={version:1,kind:'gmail-sent-index',items:[row]};
 const first=ctx.mergeDashboardSentIndex(snapshot,[],new Set(['a']));
 const second=ctx.mergeDashboardSentIndex(snapshot,first,new Set(['a']));
 assert.equal(second.length,1);assert.equal(second[0].threadId,row.threadId);assert.equal(second[0].placeName,row.placeName);
 assert.throws(()=>ctx.mergeDashboardSentIndex({...snapshot,items:[{...row,threadId:'https://unsafe.example'}]},[],new Set(['a'])));
});

test('interview recovery preserves known days, outcomes and month reminders without inventing appointment times or duplicates',()=>{
 const item={name:'Verified school',placeId:'a',day:'2026-11-09',completed:true,outcome:'unfavorable',note:'Verified note',reminderMonth:'2027-09'};
 const snapshot={version:1,kind:'calendar-interviews',interviews:[item]};
 const rows=context.mergeCalendarInterviewImport(snapshot,[],new Set(['a']));
 assert.equal(rows.length,1);assert.equal(rows[0].timeUnknown,true);assert.equal(rows[0].completed,true);assert.equal(rows[0].reminderMonth,'2027-09');
 assert.equal(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date(rows[0].date)),'2026-11-09');
 assert.equal(context.mergeCalendarInterviewImport(snapshot,rows,new Set(['a'])).length,1);
 assert.throws(()=>context.mergeCalendarInterviewImport({...snapshot,interviews:[{...item,day:'2026-02-31'}]},[],new Set(['a'])));
});
test('Candidatures links interviews by centre ID and shows completion separately from pending or unfavorable outcomes',async()=>{
 const ctx=vm.createContext({Date,Intl});
 vm.runInContext(await readFile(new URL('../assets/js/renovacions.js',import.meta.url),'utf8'),ctx);
 vm.runInContext((await readFile(new URL('../assets/js/candidatures.js',import.meta.url),'utf8')).split('\n(function(){')[0],ctx);
 const record={type:'interview',placeId:'a',text:'A previously recorded name',completed:true,outcome:'pending'};
 assert.equal(ctx.dashboardInterviewDetails({id:'a',name:'Current directory name'},[record]).label,'Entrevista realitzada · Pendent de resposta');
 assert.equal(ctx.dashboardInterviewDetails({id:'b',name:record.text},[record]),null,'a linked interview must not leak to another same-named centre');
 assert.equal(ctx.dashboardInterviewDetails({id:'a'},[{...record,outcome:'unfavorable'}]).label,'Entrevista realitzada · Resposta desfavorable');
});
