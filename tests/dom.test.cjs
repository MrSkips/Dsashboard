const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');
async function app(t,seed={}){
  const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.com/Dsashboard/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window;w.fetch=async()=>{throw Error('Offline test')};w.HTMLElement.prototype.scrollIntoView=function(){};
  for(const [key,value] of Object.entries(seed))w.localStorage.setItem(key,JSON.stringify(value));
  w.eval(fs.readFileSync(path.join(root,'dashboard-ui.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(root,'app.js'),'utf8'));
  await new Promise(resolve=>setImmediate(resolve));
  t.after(async()=>{await new Promise(resolve=>setImmediate(resolve));const captured=[...errors];w.close();assert.deepEqual(captured,[]);});
  return w;
}
test('entire app starts offline and all main panels render',async t=>{
  const w=await app(t);
  assert.equal(w.document.querySelectorAll('.modal-overlay.open').length,0);
  assert.equal(w.gatherState().transactions.length,0);
  assert.equal(w.eval('validateBundle(gatherState()) && true'),true);
  for(const [open,close] of [['openScheduleModal','closeScheduleModal'],['openBudgetModal','closeBudgetModal'],['openGradesModal','closeGradesModal'],['openTimerModal','closeTimerModal'],['openHabitsModal','closeHabitsModal'],['openInsightsModal','closeInsightsModal']]){
    w[open]();await new Promise(resolve=>setImmediate(resolve));assert.ok(w.document.querySelector('.modal-overlay.open [role="dialog"]'));w[close]();await new Promise(resolve=>setImmediate(resolve));assert.equal(w.document.querySelector('#mainGrid').inert,false);
  }
});
test('quick capture, completion, and event changes refresh the daily planner',async t=>{
  const w=await app(t);w.handleQuickCapture('Test task');await new Promise(resolve=>setImmediate(resolve));
  assert.match(w.document.getElementById('dailyPlannerList').textContent,/Test task/);
  w.toggleTodo(0);await new Promise(resolve=>setImmediate(resolve));assert.doesNotMatch(w.document.getElementById('dailyPlannerList').textContent,/Test task/);
  w.addEvent(w.todayISO(),'3:00 PM','Test meeting');await new Promise(resolve=>setImmediate(resolve));assert.match(w.document.getElementById('dailyPlannerList').textContent,/Test meeting/);
  w.deleteEvent(0);await new Promise(resolve=>setImmediate(resolve));assert.doesNotMatch(w.document.getElementById('dailyPlannerList').textContent,/Test meeting/);
});
test('backup roundtrip preserves all sections and keeps prior data recoverable',async t=>{
  const w=await app(t,{wit_todos:[{text:'Original',done:false}],wit_habits:[{name:'Read',log:{}}]});
  const backup=w.eval('JSON.parse(JSON.stringify(gatherState()))');w.applyCloudState(backup);
  assert.match(w.localStorage.getItem('wit_before_restore'),/Original/);
  w.applyCloudState({todos:[{text:'Restored',done:false}],name:''});assert.match(w.document.getElementById('todoList').textContent,/Restored/);
  const before=w.localStorage.getItem('wit_todos');assert.throws(()=>w.applyCloudState({todos:[null]}));assert.equal(w.localStorage.getItem('wit_todos'),before);
});
test('co-op status works without dragging and leaves other records untouched',async t=>{
  const w=await app(t,{wit_coop:[{company:'Example',role:'Intern',status:'Applied',link:''}]});
  const select=w.document.querySelector('.coop-status');assert.ok(select);w.editCoop(0,'status','Interviewing');assert.equal(w.gatherState().coop[0].status,'Interviewing');
});
test('schedule tabs preserve the task category filter and closed forms are inert',async t=>{
  const w=await app(t);w.setTodoFilter('Academic');w.openScheduleModal();
  assert.ok(w.document.querySelector('#todoFilterTabs [data-cat="Academic"]').classList.contains('active'));
  assert.equal(w.document.getElementById('deadlineForm').inert,true);
  w.toggleForm('deadlineForm');assert.equal(w.document.getElementById('deadlineForm').inert,false);
});
test('in-app calendar events and recurrence are included in ICS export',async t=>{
  const w=await app(t);w.addEvent('2026-09-10','3:00 PM','Office hours',{endTime:'4:00 PM',recurrence:{freq:'weekly',interval:2,byDay:[4],end:{type:'count',n:4}},exceptions:['2026-09-24']});
  const ics=w.buildICS();assert.match(ics,/SUMMARY:Office hours/);assert.match(ics,/RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TH;COUNT=4/);assert.match(ics,/EXDATE:/);
});
test('transactions older than 25 entries remain accessible',async t=>{
  const transactions=Array.from({length:30},(_,i)=>({date:'2026-09-10',description:'Entry '+i,amount:1,type:'expense',category:'Other'}));
  const w=await app(t,{wit_transactions:transactions});assert.equal(w.document.querySelectorAll('.txn-row').length,30);
});
test('budget snapshot switches periods and tracks configured limits',async t=>{
  const now=new Date();
  const localDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const thisWeek=new Date(now);thisWeek.setDate(now.getDate()-((now.getDay()+6)%7));
  const w=await app(t,{wit_budget_limits:{weekly:100,monthly:500},wit_transactions:[
    {date:localDate(thisWeek),description:'Lunch',amount:12,type:'expense',category:'Food'},
    {date:localDate(thisWeek),description:'Pay',amount:100,type:'income',category:'Income'}
  ]});
  const body=w.document.getElementById('budgetSnapshotBody');
  assert.match(body.textContent,/\$12\.00 of \$500\.00 limit/);
  w.setBudgetView('week');
  assert.match(body.textContent,/\$12\.00 of \$100\.00 limit/);
  assert.match(body.textContent,/\$100\.00/);
});
test('budget clearly reports local storage and its complete state is syncable',async t=>{
  const w=await app(t,{wit_transactions:[{date:'2026-09-10',description:'Books',amount:25,type:'expense',category:'School'}],wit_budget_limits:{weekly:75,monthly:300},wit_recurring:[{name:'Rent',amount:900,day:1}],wit_recurring_income:[{name:'Pay',amount:200,weekday:5}]});
  const state=w.gatherState();
  assert.equal(state.transactions[0].description,'Books');
  assert.equal(state.budgetLimits.monthly,300);
  assert.equal(state.recurringBills[0].name,'Rent');
  assert.equal(state.recurringIncome[0].name,'Pay');
  assert.ok(state.simBudget.categories.length);
  assert.match(w.document.getElementById('budgetSnapshotStorageState').textContent,/Saved only in this browser/);
  w.syncBudgetNow();
  assert.ok(w.document.getElementById('lockOverlay').classList.contains('open'));
});
test('command palette replaces an open dialog and restores the original focus',async t=>{
  const w=await app(t);const opener=w.document.querySelector('[onclick="openScheduleModal()"]');opener.focus();
  w.openScheduleModal();w.openPalette();assert.equal(w.document.querySelectorAll('.modal-overlay.open').length,1);assert.equal(w.document.getElementById('paletteOverlay').inert,false);
  w.closePalette();assert.equal(w.document.activeElement,opener);assert.equal(w.document.getElementById('mainGrid').inert,false);
});
test('labeled editor replaces prompts and returns to its parent dialog',async t=>{
  const w=await app(t,{wit_grades:[{name:'Calculus',credits:4,percent:91}]});
  assert.equal(w.document.querySelectorAll('[contenteditable]').length,0);
  w.openGradesModal();
  const editing=w.editCourseDialog(0);
  assert.ok(w.document.getElementById('editDialogOverlay').classList.contains('open'));
  w.document.getElementById('editField_name').value='Calculus II';
  w.submitEditDialog(new w.Event('submit'));
  await editing;
  assert.ok(w.document.getElementById('gradesOverlay').classList.contains('open'));
  assert.match(w.document.getElementById('gradesBody').textContent,/Calculus II/);
});
test('focus timer resumes from persisted end time',async t=>{
  const endsAt=Date.now()+10*60*1000;
  const w=await app(t,{wit_timer_state:{mode:'focus',remaining:1200,running:true,endsAt}});
  w.openTimerModal();
  assert.match(w.document.getElementById('timerDisplay').textContent,/^(09:5[0-9]|10:00)$/);
  assert.equal(w.document.getElementById('timerStartBtn').textContent,'Pause');
});
test('malformed stored rows are quarantined before initial rendering',async t=>{
  const w=await app(t,{wit_todos:[null]});assert.deepEqual(JSON.parse(w.localStorage.getItem('wit_todos_recovery')),[null]);assert.equal(w.gatherState().todos.length,0);
});
