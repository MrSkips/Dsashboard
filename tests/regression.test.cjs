const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function context(names,extra={}){
  const ctx=vm.createContext({Date,URL,console,setTimeout:()=>{},queueMicrotask:fn=>fn(),...extra});
  for(const name of names){
    const start=source.indexOf('function '+name+'(');
    assert.ok(start>=0,name+' exists');
    const firstLine=source.slice(start).split('\n')[0];
    const code=firstLine.endsWith('}')?firstLine:source.slice(start,source.indexOf('\n}',start)+2);
    vm.runInContext(code,ctx);
  }
  return ctx;
}
function clock(iso){return class extends Date{constructor(...args){super(...(args.length?args:[iso]));}static now(){return new Date(iso).getTime();}};}
test('calendar dates use the local day near UTC midnight',()=>{
  const previous=process.env.TZ;process.env.TZ='America/New_York';
  try{const c=context(['localISODate','todayISO'],{Date:clock('2026-09-11T01:30:00Z')});assert.equal(c.todayISO(),'2026-09-10');}finally{process.env.TZ=previous;}
});
test('malformed stored JSON preserves bytes and does not crash startup',()=>{
  const storage=new Map([['wit_todos','{broken']]);
  const c=context(['load'],{localStorage:{getItem:k=>storage.get(k)}});
  assert.deepEqual(c.load('wit_todos',[]),[]);assert.equal(storage.get('wit_todos'),'{broken');
});
test('saved collection type mismatch falls back safely',()=>{
  const c=context(['load'],{localStorage:{getItem:()=>'{"wrong":true}'}});
  assert.deepEqual(c.load('wit_todos',[]),[]);
});
test('only http(s) URLs can be followed from editable data',()=>{
  const c=context(['safeUrl','esc']);
  for(const value of ['javascript:alert(1)','data:text/html,hello','file:///etc/passwd'])assert.equal(c.safeUrl(value),'#');
  assert.equal(c.safeUrl('example.com'),'https://example.com/');
  assert.equal(c.esc(42),'42');assert.equal(c.esc('<img>'),'&lt;img&gt;');
});
test('Wentworth grade weights match the published undergraduate scale',()=>{
  const c=context(['gradeInfoForPercent'],{GPA_SCALE:[
    {min:93,letter:'A',points:4},{min:90,letter:'A-',points:3.67},{min:87,letter:'B+',points:3.33},
    {min:83,letter:'B',points:3},{min:80,letter:'B-',points:2.67},{min:77,letter:'C+',points:2.33},
    {min:73,letter:'C',points:2},{min:70,letter:'C-',points:1.67},{min:67,letter:'D+',points:1.33},
    {min:60,letter:'D',points:1},{min:-Infinity,letter:'F',points:0}
  ]});
  assert.equal(c.gradeInfoForPercent(90).points,3.67);assert.equal(c.gradeInfoForPercent(90).letter,'A-');
  assert.equal(c.gradeInfoForPercent(62).points,1);assert.equal(c.gradeInfoForPercent(62).letter,'D');
});
test('weekly pay is recorded once per actual payday, including old ledger migration',()=>{
  const c=context(['localISODate','refreshWeeklyIncome'],{Date:clock('2026-09-14T12:00:00'),recurringIncome:[{name:'Pay',amount:100,weekday:5}],incomeLog:{'Pay|5':'2026-W37'},transactions:[{date:'2026-09-11',description:'Pay',amount:100,type:'income'}],save:()=>{}});
  c.refreshWeeklyIncome();assert.equal(c.transactions.length,1);assert.equal(c.incomeLog['Pay|5'],'2026-09-11');
  c.Date=clock('2026-09-18T12:00:00');c.refreshWeeklyIncome();c.refreshWeeklyIncome();assert.equal(c.transactions.length,2);assert.equal(c.transactions[1].date,'2026-09-18');
});
test('timer catches up after background throttling',()=>{
  const c=context(['tickTimer'],{Date:clock('2026-09-10T12:10:00Z'),timerState:{running:true,mode:'focus',remaining:1500,endsAt:new Date('2026-09-10T12:25:00Z').getTime()},timerSettings:{focusMin:25,breakMin:5},renderTimer:()=>{},logFocusSession:()=>{},persistTimerState:()=>{},toast:()=>{}});
  c.tickTimer();assert.equal(c.timerState.remaining,900);
});
test('completed timer logs once and starts the next mode from current time',()=>{
  let logged=0;
  const c=context(['tickTimer'],{Date:clock('2026-09-10T13:00:00Z'),timerState:{running:true,mode:'focus',remaining:1,endsAt:1},timerSettings:{focusMin:25,breakMin:5},renderTimer:()=>{},logFocusSession:()=>logged++,persistTimerState:()=>{},toast:()=>{}});
  c.tickTimer();c.tickTimer();assert.equal(logged,1);assert.equal(c.timerState.mode,'break');assert.equal(c.timerState.remaining,300);
});
test('month navigation from January 31 does not skip February',()=>{
  const c=context(['navigateSchedule'],{scheduleViewState:{view:'month',date:new Date(2026,0,31)},renderScheduleView:()=>{}});
  c.navigateSchedule(1);assert.equal(c.scheduleViewState.date.getMonth(),1);
});
test('yesterdays streak remains until today is missed',()=>{
  const c=context(['localISODate','computeStreak'],{Date:clock('2026-09-10T12:00:00')});
  assert.equal(c.computeStreak({log:{'2026-09-09':true,'2026-09-08':true}}),2);
});
test('backup rejects malformed nested records before any writes',()=>{
  const c=context(['localISODate','validateBundle'],{COOP_STATUSES:['Applied','Interviewing','Offer','Rejected']});
  for(const bundle of [{},[],{todos:[null]},{habits:[{name:'Read'}]},{deadlines:[{title:'x',priority:'<img>'}]},{events:[{id:'a',title:'x',date:'2026-02-31'}]},{transactions:[{description:'x',amount:{}}]}])assert.throws(()=>c.validateBundle(bundle));
  assert.doesNotThrow(()=>c.validateBundle({todos:[],habits:[{name:'Read',log:{}}],name:''}));
});
test('weekly deadline undo restores the correct item after sorting',()=>{
  let undo;
  const d={title:'A',date:'2026-09-10',repeat:'weekly'},other={title:'B',date:'2026-09-12'};
  const c=context(['localISODate','completeDeadline'],{deadlines:[d,other],save:()=>{},renderDeadlines:()=>c.deadlines.sort((a,b)=>a.date.localeCompare(b.date)),fmtDeadlineDate:x=>x,toast:(_m,_e,fn)=>undo=fn});
  c.completeDeadline(0);undo();assert.equal(c.deadlines.length,2);assert.ok(c.deadlines.includes(other));assert.ok(c.deadlines.includes(d));
});
test('weekly calendar recurrence defaults to the DTSTART weekday',()=>{
  const c=context(['computeOccurrencesForDate','parseLeadingTime'],{DAY_CODES:['SU','MO','TU','WE','TH','FR','SA'],fmtTime:d=>d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})});
  const result=c.computeOccurrencesForDate([{dtstartISO:'2026-09-10T09:00:00',dtendISO:'2026-09-10T10:00:00',freq:'WEEKLY',byday:[],summary:'Class',location:''}],new Date(2026,8,17));
  assert.equal(result.length,1);
});
test('service worker ignores authenticated and external requests and unrelated caches',async()=>{
  const handlers={},deleted=[];
  const c=vm.createContext({URL,Response,Set,Promise,self:{registration:{scope:'https://example.com/Dsashboard/'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{},clients:{claim:async()=>{}}},caches:{keys:async()=>['other-app','wit-dashboard-v1','wit-dashboard-v2'],delete:async key=>deleted.push(key)}});
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8'),c);
  for(const request of [{url:'https://api.github.com/gists/1',method:'GET',headers:new Headers()},{url:'https://example.com/Dsashboard/app.js',method:'GET',headers:new Headers({Authorization:'token test'})}])handlers.fetch({request,respondWith:()=>assert.fail('must not intercept')});
  let done;handlers.activate({waitUntil:p=>done=p});await done;assert.deepEqual(deleted,['wit-dashboard-v1','wit-dashboard-v2']);
});
test('entrypoint assets exist and all JavaScript parses',()=>{
  const path=require('node:path'),root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const file of ['dashboard-ui.js','app.js','styles.css','sw.js','manifest.json','icon.svg','icon-192.png','icon-512.png'])assert.ok(fs.existsSync(path.join(root,file)),file);
  new vm.Script(fs.readFileSync(path.join(root,'dashboard-ui.js'),'utf8'));new vm.Script(source);new vm.Script(fs.readFileSync(path.join(root,'sw.js'),'utf8'));
  for(const match of html.matchAll(/\son(?:click|change|keydown|input|blur|focus|pointerdown|pointerup|pointerleave|pointercancel)="([^"]*)"/g))new Function('event',match[1]);
  JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  assert.ok(html.includes('<main '));assert.ok(html.includes('</main>'));
});
test('phone styles use one-column content and touch-sized controls',()=>{
  const css=fs.readFileSync(require('node:path').join(__dirname,'../styles.css'),'utf8');
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.grid\{grid-template-columns:minmax\(0,1fr\);\}/);
  assert.match(css,/\.icon-btn,\.del-btn,\.close-modal\{min-height:42px;min-width:42px;\}/);
  assert.match(css,/\.week-grid\{min-width:0;grid-template-columns:1fr;/);
});
