const DASHBOARD_VERSION = '1.2.0';
let __dailyPlannerReady = false; // flips true once classes/deadlines/events/todos have all been declared
const DASHBOARD_UPDATED = 'Sep 2026 — reliability, accessible controls, and calmer layout';
/* ============ live clock ============ */
function updateClock(){
  const now = new Date();
  document.getElementById('dateStr').textContent = now.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'});
  document.getElementById('timeStr').textContent = now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}
updateClock();
setInterval(updateClock,1000*30);

/* ============ Countdown pill ============ */
let countdown = load('wit_countdown', { label:'Finals Week', date:'' });
function renderCountdown(){
  const pill = document.getElementById('countdownPill');
  if(!pill) return;
  if(!countdown.date){
    pill.textContent = '🎯 Set a countdown';
    return;
  }
  const due = new Date(countdown.date + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  const days = Math.round((due - now) / 86400000);
  if(days > 0) pill.textContent = `🎯 ${countdown.label || 'Countdown'} in ${days}d`;
  else if(days === 0) pill.textContent = `🎯 ${countdown.label || 'Countdown'} is today`;
  else pill.textContent = `🎯 ${countdown.label || 'Countdown'} was ${Math.abs(days)}d ago`;
}
function editCountdown(){
  const label = prompt('Countdown label (e.g. Finals Week, Co-op starts):', countdown.label || '');
  if(label === null) return;
  const dateStr = prompt('Date (YYYY-MM-DD):', countdown.date || '');
  if(dateStr === null) return;
  countdown = { label: label.trim(), date: dateStr.trim() };
  save('wit_countdown', countdown);
  renderCountdown();
}
renderCountdown();
setInterval(renderCountdown, 1000*60*30); // keep "Xd" accurate across a long-open tab

/* ============ Semester progress bar ============ */
let semester = load('wit_semester', { start:'', end:'' });
function renderSemesterBar(){
  const fill = document.getElementById('semesterBarFill');
  const label = document.getElementById('semesterBarLabel');
  if(!fill || !label) return;
  if(!semester.start || !semester.end){
    fill.style.width = '0%';
    label.textContent = 'Click to set semester start/end dates';
    return;
  }
  const start = new Date(semester.start + 'T00:00:00');
  const end = new Date(semester.end + 'T00:00:00');
  const now = new Date();
  const totalDays = Math.max(1, Math.round((end - start) / 86400000));
  const elapsedDays = Math.round((now - start) / 86400000);
  const pct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  fill.style.width = pct.toFixed(1) + '%';
  const week = Math.max(1, Math.ceil(elapsedDays / 7));
  const totalWeeks = Math.ceil(totalDays / 7);
  if(now < start) label.textContent = `Semester starts ${fmtDeadlineDate(semester.start)}`;
  else if(now > end) label.textContent = 'Semester complete';
  else label.textContent = `Week ${week} of ${totalWeeks} · ${pct.toFixed(0)}% through the semester`;
}
function editSemester(){
  const start = prompt('Semester start date (YYYY-MM-DD):', semester.start || '');
  if(start === null) return;
  const end = prompt('Semester end date (YYYY-MM-DD):', semester.end || '');
  if(end === null) return;
  semester = { start: start.trim(), end: end.trim() };
  save('wit_semester', semester);
  renderSemesterBar();
}
renderSemesterBar();
setInterval(renderSemesterBar, 1000*60*30);

/* ============ weather (Open-Meteo, no key) ============ */
// Custom loading ring + cycling status text instead of a generic spinner,
// per the drafting-board loading-state pattern.
const weatherLoadingPhrases = ['Locating station…','Reading sensors…','Checking Boston skies…','Cross-referencing forecast…'];
let weatherPhraseIdx = 0;
const weatherStatusEl = document.getElementById('weatherStatus');
const weatherLoadingTimer = setInterval(()=>{
  weatherPhraseIdx = (weatherPhraseIdx + 1) % weatherLoadingPhrases.length;
  if(weatherStatusEl) weatherStatusEl.textContent = weatherLoadingPhrases[weatherPhraseIdx];
}, 1400);
const WEATHER_EMOJI = (code)=>{
  if(code === 0) return '☀️';
  if(code <= 3) return '⛅';
  if(code === 45 || code === 48) return '🌫️';
  if(code >= 51 && code <= 67) return '🌧️';
  if(code >= 71 && code <= 77) return '❄️';
  if(code >= 80 && code <= 82) return '🌦️';
  if(code >= 95) return '⛈️';
  return '🌡️';
};
function wearHint(t){
  if(t < 32) return '🧥 Bundle up — below freezing';
  if(t < 50) return '🧥 Wear a jacket';
  if(t < 65) return '👕 Light jacket weather';
  if(t < 75) return '👕 T-shirt weather';
  return '🩳 Stay cool out there';
}
function toggleWeatherDetail(){
  const el = document.getElementById('weatherDetail');
  if(el) el.classList.toggle('open');
}
fetch('https://api.open-meteo.com/v1/forecast?latitude=42.34&longitude=-71.09&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=4')
  .then(r=>r.json())
  .then(d=>{
    const t = Math.round(d.current.temperature_2m);
    clearInterval(weatherLoadingTimer);
    document.getElementById('weatherPill').innerHTML =
      '📍 <b>Boston, MA</b> — ' + t + '°F <span class="loading-status" style="margin-left:4px;">▾</span>' +
      '<div id="weatherDetail" class="weather-detail"></div>';
    const detailEl = document.getElementById('weatherDetail');
    if(detailEl && d.daily){
      const rows = d.daily.time.map((dateStr,i)=>{
        const dayLabel = i === 0 ? 'Today' : new Date(dateStr+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'});
        const hi = Math.round(d.daily.temperature_2m_max[i]);
        const lo = Math.round(d.daily.temperature_2m_min[i]);
        return `<div class="weather-row"><span>${WEATHER_EMOJI(d.daily.weathercode[i])} ${dayLabel}</span><span>${hi}° / ${lo}°</span></div>`;
      }).join('');
      detailEl.innerHTML = rows + `<div class="weather-wear">${wearHint(t)}</div>`;
    }
  }).catch(()=>{
    clearInterval(weatherLoadingTimer);
    document.getElementById('weatherPill').textContent = '📍 Boston, MA — weather unavailable';
  });

/* ============ generic helpers ============ */
function toggleForm(id){
  const el = document.getElementById(id);
  el.classList.toggle('open');
  el.inert = !el.classList.contains('open');
  if(!el.inert) el.querySelector('input,select,textarea,button')?.focus();
}

/* ---- Sliding pill-tab indicator (view-tabs / pie-toggle / sim-mode-toggle) ----
   Positions the indicator via offsetLeft/offsetWidth of the active button,
   animated purely by the CSS transition on .tab-indicator's left/width. */
function updateTabIndicator(container){
  if(!container) return;
  const active = container.querySelector('.active');
  const indicator = container.querySelector('.tab-indicator');
  if(!active || !indicator) return;
  indicator.style.left = active.offsetLeft + 'px';
  indicator.style.width = active.offsetWidth + 'px';
}
window.addEventListener('resize', ()=>{
  document.querySelectorAll('.view-tabs, .pie-toggle, .sim-mode-toggle').forEach(updateTabIndicator);
});


/* ---- Keyboard shortcuts (ignored while typing in a field) ---- */
document.addEventListener('keydown', (e)=>{
  const tag = (e.target.tagName || '').toLowerCase();
  const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if(e.key === 'Escape'){
    if(focusModeActive){ toggleFocusMode(); return; }
    document.querySelectorAll('.modal-overlay.open').forEach(o => hideOverlay(o.id));
    return;
  }
  if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
    e.preventDefault();
    openPalette();
    return;
  }
  if(e.key === '?' && !isTyping){ e.preventDefault(); openShortcutsModal(); return; }
  if(isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.key === '/'){ e.preventDefault(); document.getElementById('searchBox').focus(); }
  else if(e.key === 's'){ openScheduleModal(); }
  else if(e.key === 'b'){ openBudgetModal(); }
  else if(e.key === 'g'){ openGradesModal(); }
  else if(e.key === 't'){ openTimerModal(); }
  else if(e.key === 'h'){ openHabitsModal(); }
  else if(e.key === 'i'){ openInsightsModal(); }
  else if(e.key === 'f'){ toggleFocusMode(); }
  else if(e.key === 'n'){ e.preventDefault(); document.getElementById('newTodo').focus(); }
});

/* ---- "Found/matched" micro-interaction: scroll into view, gold flash,
   settle into a calmer persistent teal highlight. ---- */
function highlightEl(el){
  if(!el) return;
  el.scrollIntoView({behavior:'smooth', block:'center'});
  el.classList.remove('flash-highlight','settled-highlight');
  void el.offsetWidth;
  el.classList.add('flash-highlight');
  setTimeout(()=>{
    el.classList.remove('flash-highlight');
    el.classList.add('settled-highlight');
    setTimeout(()=> el.classList.remove('settled-highlight'), 4000);
  }, 1400);
}
/* ---- Smart unified search: checks internal data first, live dropdown,
   falls back to a Google search on Enter if nothing matches. ---- */
let searchResults = [];
let searchActiveIdx = -1;
function collectSearchResults(q){
  const query = q.trim().toLowerCase();
  if(!query) return [];
  const out = [];
  classes.forEach((c,i)=>{
    if((c.name||'').toLowerCase().includes(query) || (c.room||'').toLowerCase().includes(query)){
      out.push({ type:'Class', title: c.name + (c.room ? ' — ' + c.room : ''), action:()=>jumpToClass(i) });
    }
  });
  deadlines.forEach((d,i)=>{
    if((d.title||'').toLowerCase().includes(query)){
      out.push({ type:'Deadline', title: d.title + (d.date ? ' — ' + fmtDeadlineDate(d.date) : ''), action:()=>jumpToDeadline(i) });
    }
  });
  events.forEach((e,i)=>{
    if((e.title||'').toLowerCase().includes(query)){
      out.push({ type:'Event', title: e.title + (e.date ? ' — ' + fmtDeadlineDate(e.date) : '') + (e.time ? ' ' + e.time : ''), action:()=>jumpToEvent(i) });
    }
  });
  todos.forEach((t,i)=>{
    if((t.text||'').toLowerCase().includes(query)){
      out.push({ type:'To-Do', title: t.text, action:()=>jumpToTodo(i) });
    }
  });
  coop.forEach((c,i)=>{
    if((c.company||'').toLowerCase().includes(query) || (c.role||'').toLowerCase().includes(query)){
      out.push({ type:'Co-op', title: c.company + (c.role ? ' — ' + c.role : ''), action:()=>jumpToCoop(i) });
    }
  });
  transactions.forEach((t,i)=>{
    if((t.description||'').toLowerCase().includes(query) || (t.category||'').toLowerCase().includes(query)){
      const sign = t.type === 'income' ? '+' : '−';
      out.push({ type:'Transaction', title: `${t.description} ${sign}$${Number(t.amount).toFixed(2)}${t.date ? ' — ' + fmtDeadlineDate(t.date) : ''}`, action:()=>jumpToTransaction(i) });
    }
  });
  recurringBills.forEach((b,i)=>{
    if((b.name||'').toLowerCase().includes(query)){
      out.push({ type:'Recurring Bill', title: `${b.name} — $${Number(b.amount).toFixed(2)} due ${b.day}${ordinalSuffix(b.day)}`, action:()=>jumpToBill(i) });
    }
  });
  habits.forEach((h,i)=>{
    if((h.name||'').toLowerCase().includes(query)){
      out.push({ type:'Habit', title: h.name, action:()=>jumpToHabit(i) });
    }
  });
  grades.forEach((g,i)=>{
    if((g.name||'').toLowerCase().includes(query)){
      out.push({ type:'Course', title: g.name + (g.percent !== '' && g.percent !== null ? ` — ${g.percent}%` : ''), action:()=>jumpToGrade(i) });
    }
  });
  return out.slice(0, 8);
}
function jumpToClass(i){
  highlightEl(document.querySelectorAll('#classList .class-card')[i] || document.querySelector(`#classList .class-card[data-idx="${i}"]`));
}
function jumpToDeadline(i){
  highlightEl(document.querySelector(`#deadlineList .deadline[data-idx="${i}"]`));
}
// Events only live on the calendar (no dashboard card of their own), so
// "jumping" to one means opening the Schedule modal on that day.
function jumpToEvent(i){
  const ev = events[i];
  if(!ev) return;
  openScheduleModal();
  if(ev.date){
    const [y,m,d] = ev.date.split('-').map(Number);
    jumpToDate(y, m-1, d, 'day');
  }
}
function jumpToTodo(i){
  todoFilter = 'all';
  document.querySelectorAll('#todoFilterTabs .view-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
  updateTabIndicator(document.getElementById('todoFilterTabs'));
  renderTodos();
  highlightEl(document.querySelector(`#todoList .todo-item[data-idx="${i}"]`));
}
function jumpToCoop(i){
  highlightEl(document.querySelector(`#coopKanban .kanban-card[data-idx="${i}"]`));
}
function jumpToTransaction(i){
  openBudgetModal();
  highlightEl(document.querySelector(`#transactionList .txn-row[data-idx="${i}"]`));
}
function jumpToBill(i){
  openBudgetModal();
  highlightEl(document.querySelector(`#recurringList .recurring-row[data-idx="${i}"]`));
}
function jumpToHabit(i){
  openHabitsModal();
  highlightEl(document.querySelector(`#habitsBody .habit-row[data-idx="${i}"]`));
}
function jumpToGrade(i){
  openGradesModal();
  highlightEl(document.querySelector(`#gradesBody tr[data-idx="${i}"]`));
}
function handleSearchInput(q){
  searchResults = collectSearchResults(q);
  searchActiveIdx = -1;
  renderSearchDropdown(q);
}
function renderSearchDropdown(q){
  const dd = document.getElementById('searchDropdown');
  if(!q || !q.trim()){ dd.classList.remove('open'); dd.innerHTML=''; return; }
  if(searchResults.length === 0){
    dd.innerHTML = `<div class="search-result search-fallback">No matches on your dashboard — press Enter to search the web</div>`;
  } else {
    dd.innerHTML = searchResults.map((r,i)=>`
      <div class="search-result${i===searchActiveIdx?' active':''}" onmousedown="event.preventDefault(); runSearchResult(${i})">
        <span class="search-result-type">${esc(r.type)}</span>
        <span class="search-result-title">${esc(r.title)}</span>
      </div>`).join('');
  }
  dd.classList.add('open');
}
function runSearchResult(i){
  const r = searchResults[i];
  if(!r) return;
  r.action();
  closeSearchDropdown();
  document.getElementById('searchBox').value = '';
  document.getElementById('searchBox').blur();
}
function closeSearchDropdown(){
  const dd = document.getElementById('searchDropdown');
  if(dd){ dd.classList.remove('open'); dd.innerHTML=''; }
}
function searchKeydown(e){
  const box = e.target;
  if(e.key === 'Enter'){
    if(searchActiveIdx >= 0 && searchResults[searchActiveIdx]){
      runSearchResult(searchActiveIdx);
    } else if(searchResults.length === 0 && box.value.trim()){
      window.open('https://www.google.com/search?q='+encodeURIComponent(box.value),'_blank');
      closeSearchDropdown();
    }
  } else if(e.key === 'ArrowDown'){
    if(searchResults.length){ e.preventDefault(); searchActiveIdx = Math.min(searchActiveIdx+1, searchResults.length-1); renderSearchDropdown(box.value); }
  } else if(e.key === 'ArrowUp'){
    if(searchResults.length){ e.preventDefault(); searchActiveIdx = Math.max(searchActiveIdx-1, 0); renderSearchDropdown(box.value); }
  } else if(e.key === 'Escape'){
    closeSearchDropdown(); box.blur();
  }
}
function load(key, fallback){
  let raw;
  try {
    raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    const value = JSON.parse(raw);
    if(value === null || (Array.isArray(fallback) ? !Array.isArray(value) : typeof value !== typeof fallback)) throw new Error('Unexpected data type');
    const section = {wit_links:'links',wit_classes:'classes',wit_schedule:'schedule',wit_deadlines:'deadlines',wit_events:'events',wit_coop:'coop',wit_todos:'todos',wit_transactions:'transactions',wit_recurring:'recurringBills',wit_recurring_income:'recurringIncome',wit_grades:'grades',wit_habits:'habits',wit_focus_sessions:'focusSessions',wit_gpa_history:'gpaHistory',wit_simBudget:'simBudget',wit_countdown:'countdown',wit_semester:'semester',wit_income_log:'incomeLog'}[key];
    if(section) validateBundle({[section]:value});
    return value;
  } catch(error) {
    // Quarantine before any startup refresh can persist fallback data.
    if(raw !== undefined && raw !== null){
      try { localStorage.setItem(key+'_recovery',raw); } catch {}
    }
    setTimeout(()=>toast('Could not load ' + key.replace('wit_', '') + '. Saved data was preserved; export a recovery copy before editing.', true), 0);
    return fallback;
  }
}
// Sync state is declared here (rather than down in the sync module) because
// `save()` runs during the very first synchronous page load — before a
// `let` declared later in the script would be usable (temporal dead zone).
let syncEnabled = false;
let syncToken = null;
let syncGistId = null;
let syncCryptoKey = null;
let syncSaltB64 = null;
let cloudSyncTimer = null;

function save(key, val){
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch(error) { toast('Changes could not be saved on this device. Export a backup now.', true); return false; }
  if(typeof scheduleCloudPush === 'function') scheduleCloudPush();
  if(__dailyPlannerReady && ['wit_classes','wit_deadlines','wit_todos','wit_events'].includes(key)) queueMicrotask(renderDailyPlanner);
  return true;
}
function esc(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function safeUrl(value){
  try {
    const raw = String(value || '').trim();
    if(!raw) return '#';
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : 'https://' + raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '#';
  } catch { return '#'; }
}

/* ============ Quick Links ============ */
let links = load('wit_links', [
  {label:'Canvas', url:'https://wit.instructure.com'},
  {label:'Gmail', url:'https://mail.google.com'},
  {label:'Google Calendar', url:'https://calendar.google.com'},
  {label:'Campus Portal', url:'https://wit.edu'},
  {label:'Library', url:'https://wit.edu/library'}
]);
// Auto-fetches a site's favicon so quick links get a real logo/icon
// instead of a plain text initial, with no manual upload needed. Tries a
// primary favicon service, then a backup one, before giving up.
function faviconUrl(url){
  try{
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
  } catch(e){
    return '';
  }
}
function faviconBackupUrl(url){
  try{
    const u = new URL(url);
    return `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`;
  } catch(e){
    return '';
  }
}
// Called from an <img onerror>: on first failure, retries with the backup
// favicon service; on second failure, falls back to text initials.
function handleFaviconError(img){
  if(!img.dataset.triedBackup && img.dataset.backup){
    img.dataset.triedBackup = '1';
    img.src = img.dataset.backup;
  } else {
    img.parentElement.textContent = img.parentElement.dataset.fallback;
  }
}
function renderLinks(){
  const el = document.getElementById('linksList');
  el.innerHTML = '';
  links.forEach((l,i)=>{
    const div = document.createElement('div');
    div.className = 'qlink';
    const initials = esc(l.label.slice(0,2).toUpperCase());
    const fav = faviconUrl(l.url);
    const backupFav = faviconBackupUrl(l.url);
    div.innerHTML = `
      <button class="del-btn" onclick="deleteLink(${i})">✕</button>
      <a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer"><span class="icon" data-fallback="${initials}">${
        fav ? `<img src="${fav}" data-backup="${backupFav}" alt="" onerror="handleFaviconError(this)">` : initials
      }</span></a>
      <span class="label" contenteditable="true" onblur="renameLink(${i}, this.textContent)">${esc(l.label)}</span>`;
    el.appendChild(div);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'qlink-add';
  addBtn.textContent = '+ Add link';
  addBtn.onclick = addLink;
  el.appendChild(addBtn);

}
function addLink(){
  const label = prompt('Link label (e.g. Blackboard):');
  if(!label) return;
  const url = prompt('URL (e.g. https://...):');
  if(!url) return;
  if(safeUrl(url) === '#'){ toast('Enter a valid http or https link.', true); return; }
  links.push({label, url:safeUrl(url)});
  save('wit_links', links); renderLinks();
  highlightEl(document.querySelectorAll('#linksList .qlink')[links.length-1]);
}
function renameLink(i, text){
  links[i].label = text.trim() || links[i].label;
  save('wit_links', links); renderLinks();
}
function deleteLink(i){
  const removed = links[i];
  links.splice(i,1);
  save('wit_links', links); renderLinks();
  toast(`Removed "${removed.label}"`, false, ()=>{
    links.splice(i,0,removed); save('wit_links', links); renderLinks();
  });
}
renderLinks();

/* ============ Classes (manual + ICS import) ============ */
// `schedule` holds the full set of recurring/one-off events parsed from an
// imported .ics file (never filtered by date), so events can be imported
// any time — even weeks before they start — and the dashboard will keep
// showing the right classes automatically as each day arrives.
let schedule = load('wit_schedule', []);
let classes = load('wit_classes', []);

function todayISO(){ return localISODate(new Date()); }

// If the stored "today's classes" were computed on a previous day, recompute
// the ICS-derived portion from the full schedule for the current date while
// keeping any manually-added classes untouched.
function refreshClassesForToday(){
  const storedDate = localStorage.getItem('wit_classes_date');
  const today = todayISO();
  if(storedDate === today) return;
  const manualOnes = classes.filter(c => c.source !== 'ics');
  const icsOnes = schedule.length ? computeOccurrencesForDate(schedule, new Date()) : [];
  classes = manualOnes.concat(icsOnes);
  save('wit_classes', classes);
  localStorage.setItem('wit_classes_date', today);
}

function renderClasses(){
  const el = document.getElementById('classList');
  el.innerHTML = '';
  if(classes.length === 0){
    el.innerHTML = schedule.length
      ? '<div class="empty-note">No classes scheduled for today. Your imported calendar will populate this automatically on days with classes.</div>'
      : '<div class="empty-note">No classes added yet. Import an .ics file or add one manually.</div>';
    return;
  }
  classes.forEach((c,i)=>{
    const div = document.createElement('div');
    div.className = 'class-card';
    div.dataset.idx = i;
    const mapUrl = c.room ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Wentworth Institute of Technology ' + c.room)}` : '';
    div.innerHTML = `
      <button class="del-btn" onclick="deleteClass(${i})">✕</button>
      <div class="time" contenteditable="true" onblur="editClass(${i},'time',this.textContent)">${esc(c.time)}</div>
      <div class="name" contenteditable="true" onblur="editClass(${i},'name',this.textContent)">${esc(c.name)}</div>
      <div class="room" contenteditable="true" onblur="editClass(${i},'room',this.textContent)">${esc(c.room)}</div>
      ${mapUrl ? `<a class="map-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps">📍 Map</a>` : ''}`;
    el.appendChild(div);
  });

  renderDailyPlanner();
}
function addClass(){
  const time = document.getElementById('classTime').value.trim();
  const name = document.getElementById('className').value.trim();
  const room = document.getElementById('classRoom').value.trim();
  if(!name) return;
  classes.push({time, name, room, source:'manual'});
  save('wit_classes', classes); renderClasses();
  document.getElementById('classTime').value = '';
  document.getElementById('className').value = '';
  document.getElementById('classRoom').value = '';
  toggleForm('classForm');
  highlightEl(document.querySelectorAll('#classList .class-card')[classes.length-1]);
}
function editClass(i, field, val){
  classes[i][field] = val.trim();
  save('wit_classes', classes);
}
function deleteClass(i){
  // Deleting an ICS-derived class only removes it from today's view — it
  // will reappear on its next scheduled occurrence since that's recomputed
  // fresh from the imported schedule each new day.
  const removed = classes[i];
  classes.splice(i,1);
  save('wit_classes', classes); renderClasses();
  toast(`Removed "${removed.name}"`, false, ()=>{
    classes.splice(i,0,removed); save('wit_classes', classes); renderClasses();
  });
}

/* ---- ICS parsing ---- */
function parseICSDate(str){
  const m = str.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?/);
  if(!m) return null;
  const [,y,mo,d,h='0',mi='0',s='0',z] = m;
  if(z === 'Z') return new Date(Date.UTC(+y, +mo-1, +d, +h, +mi, +s));
  return new Date(+y, +mo-1, +d, +h, +mi, +s);
}
function fmtTime(d){ return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }
const DAY_CODES = ['SU','MO','TU','WE','TH','FR','SA'];

function unfoldICS(text){
  return text.replace(/\r\n/g,'\n').split('\n').reduce((lines, line)=>{
    if(/^[ \t]/.test(line) && lines.length){
      lines[lines.length-1] += line.slice(1);
    } else {
      lines.push(line);
    }
    return lines;
  }, []).join('\n');
}

// Parses every VEVENT in the file into a plain recurrence description —
// no date filtering here. This is what gets persisted as `schedule`.
function parseICSSchedule(text){
  const unfolded = unfoldICS(text);
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const results = [];

  blocks.forEach(block=>{
    block = block.split('END:VEVENT')[0];
    const get = (key) => {
      const m = block.match(new RegExp('^' + key + '[^:]*:(.*)$','m'));
      return m ? m[1].trim() : null;
    };
    const summary = get('SUMMARY') || 'Class';
    const location = get('LOCATION') || '';
    const dtstartRaw = get('DTSTART');
    const dtendRaw = get('DTEND');
    const rrule = get('RRULE');
    if(!dtstartRaw) return;
    const dtstart = parseICSDate(dtstartRaw);
    const dtend = dtendRaw ? parseICSDate(dtendRaw) : null;
    if(!dtstart) return;

    let freq = null, byday = [], until = null;
    if(rrule){
      const freqMatch = rrule.match(/FREQ=(\w+)/);
      const bydayMatch = rrule.match(/BYDAY=([\w,]+)/);
      const untilMatch = rrule.match(/UNTIL=(\d{8})/);
      freq = freqMatch ? freqMatch[1] : null;
      byday = bydayMatch ? bydayMatch[1].split(',') : [];
      until = untilMatch ? parseICSDate(untilMatch[1]) : null;
    }

    results.push({
      summary, location,
      dtstartISO: dtstart.toISOString(),
      dtendISO: dtend ? dtend.toISOString() : null,
      freq, byday,
      untilISO: until ? until.toISOString() : null
    });
  });
  return results;
}

// Given the persisted schedule, works out which events land on a specific
// calendar date — used both at import time and on every subsequent page
// load to keep "Today's Classes" accurate without re-importing.
function computeOccurrencesForDate(scheduleArr, dateObj){
  const dayStart = new Date(dateObj); dayStart.setHours(0,0,0,0);
  const dayCode = DAY_CODES[dayStart.getDay()];
  const results = [];

  scheduleArr.forEach(ev=>{
    const dtstart = new Date(ev.dtstartISO);
    const dtend = ev.dtendISO ? new Date(ev.dtendISO) : null;
    const startDay = new Date(dtstart); startDay.setHours(0,0,0,0);
    const until = ev.untilISO ? new Date(ev.untilISO) : null;
    const withinRange = startDay <= dayStart && (!until || dayStart <= until);

    let occurs = false;
    if(ev.freq === 'WEEKLY'){
      occurs = withinRange && (ev.byday.length ? ev.byday : [DAY_CODES[dtstart.getDay()]]).includes(dayCode);
    } else if(ev.freq === 'DAILY'){
      occurs = withinRange;
    } else {
      occurs = startDay.getTime() === dayStart.getTime();
    }

    if(occurs){
      const startTime = new Date(dayStart);
      startTime.setHours(dtstart.getHours(), dtstart.getMinutes(), dtstart.getSeconds());
      let endTime = null;
      if(dtend){
        endTime = new Date(dayStart);
        endTime.setHours(dtend.getHours(), dtend.getMinutes(), dtend.getSeconds());
      }
      const time = endTime ? `${fmtTime(startTime)} – ${fmtTime(endTime)}` : fmtTime(startTime);
      results.push({time, name: ev.summary, room: ev.location, source:'ics'});
    }
  });
  results.sort((a,b)=> (parseLeadingTime(a.time) || 0) - (parseLeadingTime(b.time) || 0));
  return results;
}

function handleIcsUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const parsedSchedule = parseICSSchedule(e.target.result);
      if(parsedSchedule.length === 0){
        toast('No events found in that .ics file.', true);
        return;
      }
      schedule = parsedSchedule;
      save('wit_schedule', schedule);

      const manualOnes = classes.filter(c => c.source !== 'ics');
      const todays = computeOccurrencesForDate(schedule, new Date());
      classes = manualOnes.concat(todays);
      save('wit_classes', classes);
      localStorage.setItem('wit_classes_date', todayISO());
      renderClasses();

      toast(`Imported ${schedule.length} event${schedule.length===1?'':'s'} — ${todays.length} showing today. Updates automatically each day.`);
    } catch(err){
      toast('Could not parse that .ics file: ' + err.message, true);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* ---- ICS export: classes + deadlines -> a downloadable .ics file ---- */
function icsEscape(text){
  return String(text || '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
function icsDateTimeUTC(d){
  return d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
}
function icsDateOnly(dateStr){
  return (dateStr || '').replace(/-/g,'');
}
// Best-effort: pull a start/end Date (today's date, times from the string)
// out of a free-text time range like "10:00 AM – 11:15 AM".
function parseTimeRangeToday(str){
  const start = parseLeadingTime(str);
  if(!start) return null;
  const parts = String(str||'').split(/[–-]/);
  let end = null;
  if(parts[1]) end = parseLeadingTime(parts[1].trim());
  if(!end){ end = new Date(start); end.setHours(end.getHours()+1); }
  return { start, end };
}
function buildICS(){
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WIT Dashboard//EN','CALSCALE:GREGORIAN'];
  const stamp = icsDateTimeUTC(new Date());
  let uidCounter = 0;
  const nextUid = () => `wit-dashboard-${Date.now()}-${uidCounter++}@wit-dashboard`;

  // Recurring events originally imported from an .ics file — re-export with
  // their real RRULE so the recurrence survives the round trip.
  schedule.forEach(ev=>{
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + nextUid());
    lines.push('DTSTAMP:' + stamp);
    lines.push('DTSTART:' + icsDateTimeUTC(new Date(ev.dtstartISO)));
    if(ev.dtendISO) lines.push('DTEND:' + icsDateTimeUTC(new Date(ev.dtendISO)));
    if(ev.freq === 'WEEKLY'){
      let rrule = 'RRULE:FREQ=WEEKLY;BYDAY=' + (ev.byday?.length ? ev.byday : [DAY_CODES[new Date(ev.dtstartISO).getDay()]]).join(',');
      if(ev.untilISO) rrule += ';UNTIL=' + icsDateTimeUTC(new Date(ev.untilISO));
      lines.push(rrule);
    } else if(ev.freq === 'DAILY'){
      let rrule = 'RRULE:FREQ=DAILY';
      if(ev.untilISO) rrule += ';UNTIL=' + icsDateTimeUTC(new Date(ev.untilISO));
      lines.push(rrule);
    }
    lines.push('SUMMARY:' + icsEscape(ev.summary));
    if(ev.location) lines.push('LOCATION:' + icsEscape(ev.location));
    lines.push('END:VEVENT');
  });

  // Manually-added classes have no stored recurrence — export as a single
  // one-off event on today's date (best effort).
  classes.filter(c => c.source !== 'ics').forEach(c=>{
    const range = parseTimeRangeToday(c.time);
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + nextUid());
    lines.push('DTSTAMP:' + stamp);
    if(range){
      lines.push('DTSTART:' + icsDateTimeUTC(range.start));
      lines.push('DTEND:' + icsDateTimeUTC(range.end));
    } else {
      lines.push('DTSTART;VALUE=DATE:' + icsDateOnly(todayISO()));
    }
    lines.push('SUMMARY:' + icsEscape(c.name));
    if(c.room) lines.push('LOCATION:' + icsEscape(c.room));
    lines.push('END:VEVENT');
  });

  // Deadlines as all-day events.
  deadlines.forEach(d=>{
    if(!d.date) return;
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + nextUid());
    lines.push('DTSTAMP:' + stamp);
    lines.push('DTSTART;VALUE=DATE:' + icsDateOnly(d.date));
    lines.push('SUMMARY:' + icsEscape('DUE: ' + d.title));
    if(d.repeat === 'weekly') lines.push('RRULE:FREQ=WEEKLY');
    if(d.priority) lines.push('DESCRIPTION:' + icsEscape('Priority: ' + d.priority));
    lines.push('END:VEVENT');
  });

  // Include events created in this app, preserving repeat rules and skipped dates.
  events.forEach(ev=>{
    const dateTime = (date,time) => {
      const hhmm = to24h(time);
      return icsDateTimeUTC(new Date(date+'T'+hhmm+':00'));
    };
    lines.push('BEGIN:VEVENT','UID:'+icsEscape(ev.id)+'@wit-dashboard','DTSTAMP:'+stamp);
    const timed = !!to24h(ev.time);
    lines.push(timed ? 'DTSTART:'+dateTime(ev.date,ev.time) : 'DTSTART;VALUE=DATE:'+icsDateOnly(ev.date));
    if(timed && to24h(ev.endTime)) lines.push('DTEND:'+dateTime(ev.date,ev.endTime));
    const rec=ev.recurrence;
    if(rec && rec.freq && rec.freq!=='none'){
      let rule='RRULE:FREQ='+rec.freq.toUpperCase()+';INTERVAL='+Math.max(1,Number(rec.interval)||1);
      if(rec.freq==='weekly' && rec.byDay?.length) rule+=';BYDAY='+rec.byDay.map(d=>DAY_CODES[d]).join(',');
      if(rec.end?.type==='count') rule+=';COUNT='+Math.max(1,Number(rec.end.n)||1);
      if(rec.end?.type==='until' && rec.end.date) rule+=';UNTIL='+(timed ? icsDateTimeUTC(new Date(rec.end.date+'T23:59:59')) : icsDateOnly(rec.end.date));
      lines.push(rule);
    }
    if(ev.exceptions?.length) lines.push((timed?'EXDATE:':'EXDATE;VALUE=DATE:')+ev.exceptions.map(date=>timed?dateTime(date,ev.time):icsDateOnly(date)).join(','));
    lines.push('SUMMARY:'+icsEscape(ev.title),'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
function exportICS(){
  const totalEvents = schedule.length + classes.filter(c=>c.source!=='ics').length + deadlines.filter(d=>d.date).length + events.length;
  if(totalEvents === 0){ toast('Nothing to export yet — add a class, deadline, or calendar event first.', true); return; }
  const ics = buildICS();
  const blob = new Blob([ics], {type:'text/calendar'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wit-dashboard-${todayISO()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast(`Exported ${totalEvents} event${totalEvents===1?'':'s'} to .ics ✓`);
}

refreshClassesForToday();
renderClasses();

/* ============ Deadlines ============ */
let deadlines = load('wit_deadlines', []);
// Timed calendar activities (appointments, meetings, recurring commitments
// — anything with a clock time rather than an end-of-day due date). These
// only ever live on the Schedule calendar, not the Upcoming Deadlines
// card. Addable via Quick Capture (one-off only) or the "+ Add Event"
// form on the Schedule modal (supports recurrence). See addEvent/
// deleteEvent/eventOccursOnDate below.
//
// Shape: { id, date, time, endTime, title, recurrence }
//   date/time/endTime: date is the FIRST occurrence's date (or the only
//     date, for a non-repeating event); time/endTime are display labels
//     ("3:00 PM") or '' for an all-day/untimed entry.
//   recurrence: null for a one-off event, or
//     { freq:'daily'|'weekly'|'monthly', interval:Number,
//       byDay:[0-6]|null (weekly only; defaults to date's weekday),
//       end: {type:'never'} | {type:'until', date} | {type:'count', n} }
let events = load('wit_events', []);
function newEventId(){
  return 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function addEvent(date, time, title, opts){
  const ev = Object.assign(
    { id: newEventId(), date, time: time || '', endTime:'', title, recurrence: null },
    opts || {}
  );
  events.push(ev);
  save('wit_events', events);
  return ev;
}
function deleteEvent(i){
  const removed = events[i];
  events.splice(i,1);
  save('wit_events', events);
  if(document.getElementById('scheduleOverlay').classList.contains('open')) renderScheduleView();
  toast(`Removed "${removed.title}"`, false, ()=>{
    events.push(removed); save('wit_events', events);
    if(document.getElementById('scheduleOverlay').classList.contains('open')) renderScheduleView();
  });
}
// "Skip this one": adds the given date to the event's exception list, so
// eventOccursOnDate() stops matching it there while every other
// occurrence (past and future) is untouched.
function skipEventOccurrence(i, iso){
  const ev = events[i];
  if(!ev) return;
  ev.exceptions = ev.exceptions || [];
  if(ev.exceptions.includes(iso)) return;
  ev.exceptions.push(iso);
  save('wit_events', events);
  renderScheduleView();
  toast(`Skipped "${ev.title}" on ${fmtDeadlineDate(iso)}`, false, ()=>{
    ev.exceptions = ev.exceptions.filter(d => d !== iso);
    save('wit_events', events);
    renderScheduleView();
  });
}
// "End series": truncates the recurrence so nothing after (and including)
// this date fires anymore, without touching occurrences already past.
function endRecurrenceHere(i, iso){
  const ev = events[i];
  if(!ev || !ev.recurrence) return;
  const prevEnd = ev.recurrence.end;
  const cutoff = new Date(iso + 'T00:00:00'); cutoff.setDate(cutoff.getDate() - 1);
  ev.recurrence.end = { type:'until', date: localISODate(cutoff) };
  save('wit_events', events);
  renderScheduleView();
  toast(`"${ev.title}" won't repeat after ${fmtDeadlineDate(localISODate(cutoff))}`, false, ()=>{
    ev.recurrence.end = prevEnd;
    save('wit_events', events);
    renderScheduleView();
  });
}
// Reverses to12h()'s label ("3:00 PM") back into the 24h "HH:MM" an
// <input type="time"> needs, so editing an event can repopulate its time
// fields from what was actually stored.
function to24h(label){
  if(!label) return '';
  const m = label.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
  if(!m) return '';
  let h = parseInt(m[1],10) % 12;
  if(m[3].toUpperCase() === 'PM') h += 12;
  return String(h).padStart(2,'0') + ':' + m[2];
}
// Opens the same "+ Add Event" form pre-filled with an existing event's
// data, in edit mode (submitEventForm() checks editingEventId to decide
// whether to update in place instead of creating a new one).
let editingEventId = null;
function openEditEventForm(i){
  const ev = events[i];
  if(!ev) return;
  editingEventId = ev.id;
  const form = document.getElementById('addEventForm');
  if(!form.classList.contains('open')) toggleForm('addEventForm');
  document.getElementById('evTitle').value = ev.title;
  document.getElementById('evDate').value = ev.date;
  document.getElementById('evStartTime').value = to24h(ev.time);
  document.getElementById('evEndTime').value = to24h(ev.endTime);
  const rec = ev.recurrence;
  document.getElementById('evRepeat').value = (rec && rec.freq) ? rec.freq : 'none';
  document.getElementById('evInterval').value = (rec && rec.interval) ? rec.interval : 1;
  evSelectedDays = new Set((rec && rec.byDay) ? rec.byDay : []);
  const endType = (rec && rec.end) ? rec.end.type : 'never';
  document.getElementById('evEndType').value = (endType === 'until' || endType === 'count') ? endType : 'never';
  document.getElementById('evEndUntil').value = (rec && rec.end && rec.end.type === 'until') ? rec.end.date : '';
  document.getElementById('evEndCount').value = (rec && rec.end && rec.end.type === 'count') ? rec.end.n : 10;
  renderEventFormConditionals();
  const submitBtn = document.getElementById('evFormSubmitBtn');
  if(submitBtn) submitBtn.textContent = 'Save Changes';
  setTimeout(()=> document.getElementById('evTitle').focus(), 50);
}
function fmtDeadlineDate(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  const dt = new Date(+y, +m-1, +d);
  return dt.toLocaleDateString(undefined,{month:'short', day:'numeric'});
}
// High-priority items get flagged "due soon" earlier (5 days out) than
// Medium (48h, the old fixed behavior) or Low (24h) — so a big project
// doesn't just quietly wait until 2 days out to get your attention.
function dueSoonWindowHours(priority){
  return priority === 'High' ? 120 : priority === 'Low' ? 24 : 48;
}
function renderDeadlines(){
  deadlines.sort((a,b)=> (a.date||'').localeCompare(b.date||''));
  const el = document.getElementById('deadlineList');
  el.innerHTML = '';
  if(deadlines.length === 0){
    el.innerHTML = '<div class="empty-note">No deadlines. Add an assignment with the + button or Quick add.</div>';
    renderDailyPlanner(); return;
  }
  const now = new Date();
  deadlines.forEach((d,i)=>{
    const row = document.createElement('div');
    const priority = d.priority || 'Medium';
    let flagClass = '', flagLabel = '';
    if(d.date){
      const due = new Date(d.date + 'T23:59:59');
      const hoursUntil = (due - now) / 3600000;
      if(hoursUntil < 0){ flagClass = 'overdue'; flagLabel = 'Overdue'; }
      else if(hoursUntil <= dueSoonWindowHours(priority)){ flagClass = 'due-soon'; flagLabel = 'Due soon'; }
    }
    row.className = 'deadline' + (flagClass ? ' ' + flagClass : '');
    row.dataset.idx = i;
    const repeatBadge = d.repeat === 'weekly'
      ? `<span class="deadline-flag" style="background:rgba(44,175,197,.18);color:var(--wit-teal);cursor:pointer;" onclick="toggleDeadlineRepeat(${i})" title="Repeats weekly — click to turn off">↻ Weekly</span>`
      : '';
    row.innerHTML = `
      <div class="date">${fmtDeadlineDate(d.date)}</div>
      <div class="info">
        <b contenteditable="true" onblur="editDeadline(${i},'title',this.textContent)">${esc(d.title)}</b>
        <button class="priority-tag priority-${priority}" onclick="cyclePriority(${i})" title="Change priority" aria-label="Priority for ${esc(d.title)}: ${priority}">${priority}</button>${flagClass ? `<span class="deadline-flag ${flagClass}">${flagLabel}</span>` : ''}${repeatBadge}
        ${d.link ? `<a href="${esc(safeUrl(d.link))}" target="_blank" rel="noopener noreferrer">View Details</a>` : `<a href="#" onclick="event.preventDefault(); const l=prompt('Add a link:'); if(l){editDeadline(${i},'link',l);}">Add link</a>`}
      </div>
      <button class="icon-btn" style="margin-right:4px;" onclick="completeDeadline(${i})" title="${d.repeat === 'weekly' ? 'Complete — rolls forward 7 days' : 'Complete'}" aria-label="Complete ${esc(d.title)}">✓</button>
      <button class="del-btn" onclick="deleteDeadline(${i})" aria-label="Delete ${esc(d.title)}">✕</button>`;
    el.appendChild(row);
  });

  renderDailyPlanner();
}
function cyclePriority(i){
  const order = ['Low','Medium','High'];
  const cur = order.indexOf(deadlines[i].priority || 'Medium');
  deadlines[i].priority = order[(cur+1) % order.length];
  save('wit_deadlines', deadlines); renderDeadlines();
}
function addDeadline(){
  const date = document.getElementById('deadlineDate').value;
  const title = document.getElementById('deadlineTitle').value.trim();
  const link = document.getElementById('deadlineLink').value.trim();
  const priority = document.getElementById('deadlinePriority').value;
  const repeat = document.getElementById('deadlineRepeat').checked ? 'weekly' : 'none';
  if(!title) return;
  const newDeadline = {date, title, link, priority, repeat};
  deadlines.push(newDeadline);
  save('wit_deadlines', deadlines); renderDeadlines();
  document.getElementById('deadlineDate').value = '';
  document.getElementById('deadlineTitle').value = '';
  document.getElementById('deadlineLink').value = '';
  document.getElementById('deadlineRepeat').checked = false;
  toggleForm('deadlineForm');
  highlightEl(document.querySelectorAll('#deadlineList .deadline')[deadlines.indexOf(newDeadline)]);
}
function editDeadline(i, field, val){
  deadlines[i][field] = (typeof val === 'string') ? val.trim() : val;
  save('wit_deadlines', deadlines); renderDeadlines();
}
function toggleDeadlineRepeat(i){
  deadlines[i].repeat = deadlines[i].repeat === 'weekly' ? 'none' : 'weekly';
  save('wit_deadlines', deadlines); renderDeadlines();
}
// "Complete" a deadline: if it repeats weekly, roll it forward 7 days instead
// of removing it — so recurring homework/readings don't need re-typing every
// week. Non-repeating deadlines just get removed (same as delete).
function completeDeadline(i){
  const d = deadlines[i];
  if(d.repeat === 'weekly' && d.date){
    const next = new Date(d.date + 'T00:00:00');
    next.setDate(next.getDate() + 7);
    const advanced = Object.assign({}, d, { date: localISODate(next) });
    deadlines.splice(i, 1, advanced);
    save('wit_deadlines', deadlines); renderDeadlines();
    toast(`"${d.title}" completed — next due ${fmtDeadlineDate(advanced.date)}`, false, ()=>{
      const index = deadlines.indexOf(advanced);
      if(index !== -1) deadlines.splice(index, 1, d);
      else deadlines.push(d);
      save('wit_deadlines', deadlines); renderDeadlines();
    });
  } else {
    deleteDeadline(i);
  }
}
function deleteDeadline(i){
  const removed = deadlines[i];
  deadlines.splice(i,1);
  save('wit_deadlines', deadlines); renderDeadlines();
  toast(`Deleted "${removed.title}"`, false, ()=>{
    deadlines.push(removed); save('wit_deadlines', deadlines); renderDeadlines();
  });
}
renderDeadlines();

/* ============ Co-op tracker ============ */
let coop = load('wit_coop', []);
const COOP_STATUSES = ['Applied','Interviewing','Offer','Rejected'];
function renderCoop(){
  const el = document.getElementById('coopKanban');
  if(!el) return;
  el.innerHTML = COOP_STATUSES.map(status=>{
    const items = coop.map((c,i)=>({...c, _idx:i})).filter(c => (c.status||'Applied') === status);
    const cards = items.map(c => `
      <div class="kanban-card" data-idx="${c._idx}" draggable="true" ondragstart="kanbanDragStart(event,${c._idx})">
        <button class="del-btn" style="position:absolute;top:4px;right:4px;" onclick="deleteCoop(${c._idx})">✕</button>
        <div contenteditable="true" style="font-weight:600;font-size:13px;padding-right:16px;" onblur="editCoop(${c._idx},'company',this.textContent)">${esc(c.company)}</div>
        <div contenteditable="true" style="font-size:11px;color:var(--muted);margin-top:2px;" onblur="editCoop(${c._idx},'role',this.textContent)">${esc(c.role)}</div>
        <div style="margin-top:6px;">${c.link ? `<a class="post-link" href="${esc(safeUrl(c.link))}" target="_blank" rel="noopener noreferrer" style="font-size:11px;">🔗 Posting</a>` : `<a href="#" style="font-size:11px;color:var(--muted);" onclick="event.preventDefault(); const l=prompt('Posting link:'); if(l){editCoop(${c._idx},'link',l);}">＋ Link</a>`}</div>
        <select class="coop-status" aria-label="Status for ${esc(c.company)}" onchange="editCoop(${c._idx},'status',this.value)">${COOP_STATUSES.map(value=>`<option ${value===c.status?'selected':''}>${value}</option>`).join('')}</select><button class="kanban-notes-toggle" onclick="toggleCoopNotes(${c._idx})">Notes${c.notes ? ' ✓' : ''}</button>
        <div class="kanban-notes" id="coopNotes${c._idx}" style="display:none;">
          <textarea onblur="editCoop(${c._idx},'notes',this.value)" placeholder="Interview prep, contact, stipend...">${esc(c.notes||'')}</textarea>
        </div>
      </div>`).join('');
    return `<div class="kanban-col" ondragover="event.preventDefault()" ondrop="kanbanDrop(event,'${status}')">
      <div class="kanban-col-head">${status} <span class="kanban-count">${items.length}</span></div>
      <div class="kanban-col-body">${cards || '<div class="empty-note" style="padding:8px;">Empty</div>'}</div>
    </div>`;
  }).join('');
}
let kanbanDragIdx = null;
function kanbanDragStart(e, i){
  e.stopPropagation();
  kanbanDragIdx = i;
  e.dataTransfer.effectAllowed = 'move';
}
function kanbanDrop(e, status){
  e.preventDefault();
  if(kanbanDragIdx === null) return;
  coop[kanbanDragIdx].status = status;
  save('wit_coop', coop);
  kanbanDragIdx = null;
  renderCoop();
}
function toggleCoopNotes(i){
  const el = document.getElementById('coopNotes'+i);
  if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function addCoop(){
  const company = document.getElementById('coopCompany').value.trim();
  const role = document.getElementById('coopRole').value.trim();
  const status = document.getElementById('coopStatus').value;
  const link = document.getElementById('coopLink').value.trim();
  if(!company) return;
  coop.push({company, role, status, link, notes:''});
  save('wit_coop', coop); renderCoop();
  document.getElementById('coopCompany').value = '';
  document.getElementById('coopRole').value = '';
  document.getElementById('coopLink').value = '';
  toggleForm('coopForm');
  toast(`Added ${company} to ${status}`);
}
function editCoop(i, field, val){
  coop[i][field] = (typeof val === 'string') ? val.trim() : val;
  save('wit_coop', coop); renderCoop();
}
function deleteCoop(i){
  const removed = coop[i];
  coop.splice(i,1);
  save('wit_coop', coop); renderCoop();
  toast(`Removed "${removed.company}"`, false, ()=>{
    coop.splice(i,0,removed); save('wit_coop', coop); renderCoop();
  });
}
renderCoop();

/* ============ To-do list ============ */
const todoListEl = document.getElementById('todoList');
const newTodoEl = document.getElementById('newTodo');
let todos = load('wit_todos', []);
let todoFilter = 'all';
let hideCompleted = load('wit_hide_completed', false);
function renderTodos(){
  todoListEl.innerHTML = '';
  const toggle = document.getElementById('hideCompleted');
  if(toggle) toggle.checked = hideCompleted;
  const filtered = todos
    .map((t, idx) => ({...t, _idx: idx}))
    .filter(t => (todoFilter === 'all' || (t.category || 'Personal') === todoFilter) && (!hideCompleted || !t.done));
  if(filtered.length === 0){
    todoListEl.innerHTML = '<div class="empty-note">No tasks in this view. Add one below.</div>';
    renderDailyPlanner(); return;
  }
  filtered.forEach(t=>{
    const row = document.createElement('div');
    row.className = 'todo-item' + (t.done ? ' done' : '');
    row.dataset.idx = t._idx;
    row.innerHTML = `
      <input type="checkbox" aria-label="Complete ${esc(t.text)}" ${t.done?'checked':''} onchange="toggleTodo(${t._idx})">
      <label contenteditable="true" onblur="editTodo(${t._idx}, this.textContent)">${esc(t.text)}</label>
      <span class="cat-badge">${esc(t.category || 'Personal')}</span>
      <button class="del-btn" onclick="deleteTodo(${t._idx})">✕</button>`;
    todoListEl.appendChild(row);
  });

  renderDailyPlanner();
}
function setTodoFilter(cat){
  todoFilter = cat;
  document.querySelectorAll('#todoFilterTabs .view-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  updateTabIndicator(document.getElementById('todoFilterTabs'));
  renderTodos();
}
function toggleTodo(i){ todos[i].done = !todos[i].done; save('wit_todos', todos); renderTodos(); }
function editTodo(i, text){ todos[i].text = text.trim() || todos[i].text; save('wit_todos', todos); renderTodos(); }
function deleteTodo(i){
  const removed = todos[i];
  todos.splice(i,1); save('wit_todos', todos); renderTodos();
  toast(`Removed "${removed.text}"`, false, ()=>{
    todos.splice(i,0,removed); save('wit_todos', todos); renderTodos();
  });
}
newTodoEl.addEventListener('keydown', e=>{
  if(e.key === 'Enter' && newTodoEl.value.trim()){
    const cat = document.getElementById('newTodoCat').value;
    todos.push({text:newTodoEl.value.trim(), done:false, category:cat});
    newTodoEl.value='';
    save('wit_todos', todos); renderTodos();
  }
});
renderTodos();
updateTabIndicator(document.getElementById('todoFilterTabs'));

/* ============ Daily Planner ============ */
// Combines today's classes/events (timed, sorted chronologically), any
// deadlines due today, and open to-dos into one agenda view. Guards on
// classes/deadlines/todos existing yet, since renderClasses() runs once
// before deadlines/todos are declared during initial page load.
function renderDailyPlanner(){
  if(!__dailyPlannerReady) return;
  const el = document.getElementById('dailyPlannerList');
  if(!el) return;
  const today = todayISO();

  const timed = [];
  classes.forEach(c=>{
    const t = parseLeadingTime(c.time);
    timed.push({ sortKey: t ? t.getHours()*60+t.getMinutes() : 9999, label: c.time || '', title: c.name, sub: c.room, cls:'' });
  });
  if(__dailyPlannerReady){
    events.forEach(ev=>{
      if(eventOccursOnDate(ev, new Date())){
        const t = ev.time ? parseLeadingTime(ev.time) : null;
        timed.push({ sortKey: t ? t.getHours()*60+t.getMinutes() : 9998, label: ev.time || 'All day', title: ev.title, sub: '', cls:'' });
      }
    });
  }
  timed.sort((a,b)=> a.sortKey - b.sortKey);

  const dueToday = deadlines.filter(d=> d.date && d.date <= today);
  const openTodos = todos.filter(t=> !t.done);

  let html = `<div class="planner-summary"><span><b>${timed.length}</b> on the agenda</span><span><b>${dueToday.length}</b> due / overdue</span><span><b>${openTodos.length}</b> open tasks</span></div>`;
  timed.forEach(item=>{
    html += `<div class="planner-row"><div class="planner-time">${esc(item.label)}</div><div class="planner-info"><b>${esc(item.title)}</b>${item.sub ? ` <span class="planner-sub">${esc(item.sub)}</span>` : ''}</div></div>`;
  });
  dueToday.forEach(d=>{
    const priority = d.priority || 'Medium';
    html += `<div class="planner-row planner-due"><div class="planner-time">${d.date < today ? 'Overdue' : 'Due today'}</div><div class="planner-info"><b>${esc(d.title)}</b> <span class="priority-tag priority-${priority}">${esc(priority)}</span></div><button class="icon-btn" aria-label="Complete ${esc(d.title)}" onclick="completeDeadline(${deadlines.indexOf(d)})">✓</button></div>`;
  });
  if(openTodos.length){
    html += '<div class="planner-subhead">Open tasks</div>';
    openTodos.forEach(t=>{
      const realIdx = todos.indexOf(t);
      html += `<div class="planner-row planner-task"><input type="checkbox" aria-label="Complete ${esc(t.text)}" onchange="toggleTodo(${realIdx})"><div class="planner-info">${esc(t.text)}</div></div>`;
    });
  }
  if(!timed.length && !dueToday.length && !openTodos.length) html += '<div class="empty-note">Your day is clear. Use Quick add for a task, deadline, or event.</div>';
  el.innerHTML = html;
}
__dailyPlannerReady = true;
renderDailyPlanner();

/* ============ Budget ============ */
let transactions = load('wit_transactions', []);
let budgetViewMode = load('wit_budget_view', 'month');
let budgetLimits = load('wit_budget_limits', { weekly: 0, monthly: 0 });
let recurringBills = load('wit_recurring', []);
let recurringIncome = load('wit_recurring_income', []);
let incomeLog = load('wit_income_log', {}); // { "<incomeName>|<weekday>": "YYYY-MM-DD" }; accepts legacy week labels

// Auto-logs this week's occurrence of each weekly income source (once per
// source per calendar week) so paychecks don't have to be entered by hand.
function refreshWeeklyIncome(){
  if(recurringIncome.length === 0) return;
  const today = new Date();
  let changed = false;
  recurringIncome.forEach(inc=>{
    const key = inc.name + '|' + inc.weekday;
    const todayDow = today.getDay();
    let daysSince = todayDow - Number(inc.weekday);
    if(daysSince < 0) daysSince += 7;
    const occurrence = new Date(today);
    occurrence.setDate(today.getDate() - daysSince);
    const occurrenceDate = localISODate(occurrence);
    if(incomeLog[key] === occurrenceDate) return;
    // Legacy ledgers used week labels; matching the recorded payment prevents migration duplicates.
    if(transactions.some(t => t.type === 'income' && t.date === occurrenceDate && t.description === inc.name && Number(t.amount) === Number(inc.amount))){
      incomeLog[key] = occurrenceDate; changed = true; return;
    }
    transactions.push({
      date: occurrenceDate,
      description: inc.name,
      category: 'Income',
      amount: Number(inc.amount) || 0,
      type: 'income'
    });
    incomeLog[key] = occurrenceDate;
    changed = true;
  });
  if(changed){
    save('wit_transactions', transactions);
    save('wit_income_log', incomeLog);
  }
}
function localISODate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const WEEKDAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ============ Quick capture: parse free text into a deadline, transaction, or todo ============ */
/* ---- Quick Capture parsing --------------------------------------------
   Goal: NEVER silently drop what you typed. Every input resolves to one
   of transaction / deadline / to-do — worst case it just becomes a plain
   to-do with your exact text, same as the original behavior. Everything
   below is about recognizing MORE inputs correctly before falling back,
   not about becoming stricter. ------------------------------------------- */
const QC_WEEKDAYS_FULL = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const QC_WEEKDAYS_ABBR = ['sun','mon','tue','wed','thu','fri','sat'];
const QC_MONTHS_FULL = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const QC_MONTHS_ABBR = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const QC_CATEGORY_KEYWORDS = [
  [/\b(lunch|dinner|breakfast|coffee|food|pizza|restaurant|takeout|take-out|groceries|grocery|snack)\b/i, 'Food'],
  [/\b(gas|uber|lyft|parking|mbta|subway|bus|train|transport|toll)\b/i, 'Transport'],
  [/\b(textbook|book|tuition|supplies|printing|school)\b/i, 'School'],
  [/\b(rent|utilities|electric|wifi|internet)\b/i, 'Housing'],
  [/\b(movie|game|concert|fun|entertainment|steam)\b/i, 'Entertainment'],
];
function guessCategory(desc){
  for(const [re, cat] of QC_CATEGORY_KEYWORDS){ if(re.test(desc)) return cat; }
  return 'Other';
}
// Trims a matched date/priority phrase out of the text and cleans up
// whatever connector words ("due", "on", "by") and stray punctuation it
// leaves behind, from either end.
function qcStripPhrase(t, phrase){
  let s = t.replace(phrase, ' ').replace(/\s{2,}/g, ' ').trim();
  // Loop rather than a single pass: "Due on the 15th" leaves "Due on"
  // behind after the date phrase is removed, and a single strip only
  // catches the trailing "on" — repeat until nothing more connector-word
  // is left at either end.
  let prev;
  do {
    prev = s;
    s = s.replace(/^(due|on|by)\b[:\s]*/i, '').replace(/[\s:]*\b(due|on|by)$/i, '').trim();
  } while(s !== prev);
  return s.replace(/^[\s,:+-]+|[\s,:-]+$/g, '').trim();
}
// Finds the first recognizable date phrase anywhere in the text (leading,
// trailing, or in the middle) and returns {dateStr, text} with that phrase
// removed — or null if nothing date-like is present. Understands ISO
// dates, M/D(/Y), month-name dates, "today/tomorrow/yesterday", "eod",
// "in N day(s)/week(s)", and weekday names (with optional "next").
function extractDatePhrase(text){
  const t = text;

  let m = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if(m) return { dateStr: m[1], text: qcStripPhrase(t, m[0]) };

  m = t.match(/\b(\d{1,2})[\/](\d{1,2})(?:[\/](\d{2,4}))?\b/);
  if(m){
    const now = new Date();
    const month = parseInt(m[1],10) - 1, day = parseInt(m[2],10);
    let year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3],10) : parseInt(m[3],10)) : now.getFullYear();
    let d = new Date(year, month, day);
    if(!isNaN(d)){
      if(!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(year + 1);
      return { dateStr: localISODate(d), text: qcStripPhrase(t, m[0]) };
    }
  }

  const monthAlt = '(' + QC_MONTHS_FULL.join('|') + '|' + QC_MONTHS_ABBR.join('|') + ')';
  m = t.match(new RegExp('\\b' + monthAlt + '\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b', 'i'))
   || t.match(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+' + monthAlt + '\\.?\\b', 'i'));
  if(m){
    const word = isNaN(m[1]) ? m[1] : m[2];
    const dayNum = isNaN(m[1]) ? m[2] : m[1];
    let monthIdx = QC_MONTHS_FULL.indexOf(word.toLowerCase());
    if(monthIdx === -1) monthIdx = QC_MONTHS_ABBR.indexOf(word.toLowerCase());
    if(monthIdx !== -1){
      const now = new Date();
      let d = new Date(now.getFullYear(), monthIdx, parseInt(dayNum,10));
      if(d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(now.getFullYear() + 1);
      return { dateStr: localISODate(d), text: qcStripPhrase(t, m[0]) };
    }
  }

  // Bare ordinal day-of-month with no month name attached: "the 15th",
  // "due on the 3rd", "by the 21st". Assumes the current month, rolling to
  // next month if that day already passed — and only matches when the
  // resulting date is actually valid (guards against something like "the
  // 31st" landing on a 30-day month).
  m = t.match(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/i);
  if(m){
    const day = parseInt(m[1],10);
    const now = new Date();
    let d = new Date(now.getFullYear(), now.getMonth(), day);
    if(d.getDate() === day){
      if(d < new Date(now.getFullYear(), now.getMonth(), now.getDate())){
        const rolled = new Date(now.getFullYear(), now.getMonth()+1, day);
        if(rolled.getDate() === day) d = rolled;
      }
      return { dateStr: localISODate(d), text: qcStripPhrase(t, m[0]) };
    }
  }

  m = t.match(/\b(eod|end of day)\b/i);
  if(m) return { dateStr: localISODate(new Date()), text: qcStripPhrase(t, m[0]) };

  m = t.match(/\btoday\b/i);
  if(m) return { dateStr: localISODate(new Date()), text: qcStripPhrase(t, m[0]) };

  m = t.match(/\b(tomorrow|tmrw|tmr)\b/i);
  if(m){ const d = new Date(); d.setDate(d.getDate()+1); return { dateStr: localISODate(d), text: qcStripPhrase(t, m[0]) }; }

  m = t.match(/\byesterday\b/i);
  if(m){ const d = new Date(); d.setDate(d.getDate()-1); return { dateStr: localISODate(d), text: qcStripPhrase(t, m[0]) }; }

  m = t.match(/\bin\s+(\d+)\s*(day|days|week|weeks)\b/i);
  if(m){
    const n = parseInt(m[1],10);
    const d = new Date();
    d.setDate(d.getDate() + (m[2].toLowerCase().startsWith('week') ? n*7 : n));
    return { dateStr: localISODate(d), text: qcStripPhrase(t, m[0]) };
  }

  for(let i=0;i<QC_WEEKDAYS_FULL.length;i++){
    const re = new RegExp('\\b(next\\s+)?(' + QC_WEEKDAYS_FULL[i] + '|' + QC_WEEKDAYS_ABBR[i] + ')\\b','i');
    const wm = t.match(re);
    if(wm){
      const now = new Date();
      let diff = i - now.getDay();
      if(wm[1] || diff <= 0) diff += 7; // "next X" always jumps a full week; a bare weekday means the soonest one
      const d = new Date(now); d.setDate(now.getDate()+diff);
      return { dateStr: localISODate(d), text: qcStripPhrase(t, wm[0]) };
    }
  }
  return null;
}
// Finds a clock time anywhere in the text: "3pm", "3 pm", "3:30pm",
// "at 3:30 PM", or 24-hour "15:30". 12-hour forms without a colon require
// an explicit am/pm so a bare number (a page range, a room number) never
// gets misread as a time. Returns {label, text} with the phrase removed,
// or null.
function extractTimePhrase(text){
  let m = text.match(/\b(?:at\s+)?(\d{1,2})(?::([0-5]\d))?\s?(am|pm)\b/i);
  if(m){
    let h = parseInt(m[1],10) % 12;
    if(m[3].toLowerCase() === 'pm') h += 12;
    const min = m[2] ? parseInt(m[2],10) : 0;
    const label = new Date(2000,0,1,h,min).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    return { label, text: qcStripPhrase(text, m[0]) };
  }
  m = text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/);
  if(m){
    const label = new Date(2000,0,1,parseInt(m[1],10),parseInt(m[2],10)).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    return { label, text: qcStripPhrase(text, m[0]) };
  }
  return null;
}
// Pulls a trailing/embedded "!high" / "!h" / "!medium" / "!low" / "!l" or a
// bare "!!" marker out of the text and returns {priority, text}. priority
// is null (not "Medium") when no marker was found, so callers can tell
// "explicitly medium" apart from "unspecified."
function extractPriority(text){
  let m = text.match(/\B!(high|h|medium|med|m|low|l)\b/i);
  if(m){
    const p = m[1].toLowerCase();
    const priority = p.startsWith('h') ? 'High' : p.startsWith('l') ? 'Low' : 'Medium';
    return { priority, text: qcStripPhrase(text, m[0]) };
  }
  m = text.match(/!{2,}/);
  if(m) return { priority: 'High', text: qcStripPhrase(text, m[0]) };
  return { priority: null, text };
}
function parseQuickCapture(text){
  let t = (text || '').trim();
  if(!t) return { kind:'todo', text:'' };

  const pr = extractPriority(t);
  const priority = pr.priority;
  t = pr.text;

  // ---- money -> transaction. Accepts "$12", "$12.50", "12 dollars", a
  // leading "+"/"-" sign (only when it opens the whole entry, so "pages
  // 10-15" doesn't misfire as "-15"), and "income"/"paycheck" as income
  // cues. ----
  const moneyMatch = t.match(/^([+-])(\d+(?:\.\d{1,2})?)\b/) || t.match(/([+-])?\$\s?(\d+(?:\.\d{1,2})?)/) || t.match(/([+-])?\b(\d+(?:\.\d{1,2})?)\s?(?:dollars|bucks)\b/i);
  if(moneyMatch){
    const sign = moneyMatch[1] || '';
    const amount = parseFloat(moneyMatch[2]);
    let description = t.replace(moneyMatch[0], ' ');
    const dateInfo = extractDatePhrase(description);
    let txnDate = todayISO();
    if(dateInfo){ txnDate = dateInfo.dateStr; description = dateInfo.text; }
    description = description.replace(/\s{2,}/g,' ').replace(/^[\s,:+-]+|[\s,:-]+$/g,'').trim();
    const isIncome = sign === '+' || (sign !== '-' && /\b(income|paycheck|got paid|earned|refund|deposit|payout)\b/i.test(t));
    const type = isIncome ? 'income' : 'expense';
    const category = type === 'income' ? 'Income' : guessCategory(description);
    return { kind:'transaction', amount, type, date: txnDate, category, description: description || (type === 'income' ? 'Income' : 'Expense') };
  }

  // ---- a clock time anywhere -> a one-off calendar activity (an
  // appointment/meeting), not a due-date deadline. A date phrase alongside
  // it sets which day; no date phrase defaults to today. Either way this
  // goes straight onto the Schedule calendar. ----
  const timeInfo = extractTimePhrase(t);
  const dateSource = timeInfo ? timeInfo.text : t;
  const dateInfo = extractDatePhrase(dateSource);
  if(timeInfo){
    const title = (dateInfo ? dateInfo.text : dateSource) || 'Untitled event';
    return { kind:'event', date: dateInfo ? dateInfo.dateStr : todayISO(), time: timeInfo.label, title };
  }

  // ---- otherwise, any recognizable date phrase -> deadline (also shows
  // up on the calendar automatically, since the calendar reads from the
  // same `deadlines` list) ----
  if(dateInfo){
    return { kind:'deadline', date: dateInfo.dateStr, title: dateInfo.text || 'Untitled deadline', priority: priority || 'Medium' };
  }

  // ---- fallback: plain to-do — always captures SOMETHING, never drops it ----
  return { kind:'todo', text: t };
}
function handleQuickCapture(raw){
  const parsed = parseQuickCapture(raw);
  if(parsed.kind === 'transaction'){
    transactions.push({ date: parsed.date || todayISO(), description: parsed.description, category: parsed.category, amount: parsed.amount, type: parsed.type });
    save('wit_transactions', transactions);
    renderBudget();
    const whenNote = parsed.date && parsed.date !== todayISO() ? ` (${fmtDeadlineDate(parsed.date)})` : '';
    toast(`Logged ${parsed.type === 'income' ? '+' : '−'}$${parsed.amount.toFixed(2)} — ${parsed.description} · ${parsed.category}${whenNote}`);
  } else if(parsed.kind === 'deadline'){
    const nd = { date: parsed.date, title: parsed.title, link:'', priority: parsed.priority || 'Medium', repeat:'none' };
    deadlines.push(nd);
    save('wit_deadlines', deadlines);
    renderDeadlines();
    toast(`Added deadline: ${parsed.title} (${fmtDeadlineDate(parsed.date)}) · ${nd.priority} priority — on the calendar too`);
    highlightEl(document.querySelectorAll('#deadlineList .deadline')[deadlines.indexOf(nd)]);
  } else if(parsed.kind === 'event'){
    addEvent(parsed.date, parsed.time, parsed.title);
    toast(`Added to calendar: ${parsed.title} — ${fmtDeadlineDate(parsed.date)}${parsed.time ? ' at ' + parsed.time : ''}`);
  } else {
    todos.push({ text: parsed.text, done:false, category:'Personal' });
    save('wit_todos', todos);
    renderTodos();
    toast(`Added to-do: ${parsed.text}`);
  }
}

function renderIncome(){
  const el = document.getElementById('incomeList');
  if(!el) return;
  if(recurringIncome.length === 0){
    el.innerHTML = '<div class="empty-note">No recurring income added.</div>';
    return;
  }
  el.innerHTML = recurringIncome.map((inc,i)=>`
    <div class="recurring-row">
      <span contenteditable="true" onblur="editIncome(${i},'name',this.textContent)">${esc(inc.name)}</span>
      <span style="display:flex;align-items:center;gap:6px;">
        <span contenteditable="true" onblur="editIncome(${i},'amount',this.textContent)">$${Number(inc.amount).toFixed(2)}</span>
        <span style="color:var(--muted);">Every ${WEEKDAY_NAMES[inc.weekday]}</span>
        <button class="del-btn" onclick="deleteIncome(${i})">✕</button>
      </span>
    </div>`).join('');

}
function addIncome(){
  const name = document.getElementById('incomeName').value.trim();
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const weekday = parseInt(document.getElementById('incomeWeekday').value, 10);
  if(!name || isNaN(amount)) return;
  recurringIncome.push({name, amount, weekday});
  save('wit_recurring_income', recurringIncome);
  refreshWeeklyIncome();
  renderIncome();
  renderBudget();
  document.getElementById('incomeName').value = '';
  document.getElementById('incomeAmount').value = '';
  toggleForm('incomeForm');
  highlightEl(document.querySelectorAll('#incomeList .recurring-row')[recurringIncome.length-1]);
}
function editIncome(i, field, val){
  if(field === 'amount'){
    const parsed = parseFloat(String(val).replace(/[^0-9.]/g,''));
    recurringIncome[i].amount = isNaN(parsed) ? recurringIncome[i].amount : parsed;
  } else {
    recurringIncome[i][field] = val.trim();
  }
  save('wit_recurring_income', recurringIncome);
  renderIncome();
}
function deleteIncome(i){
  const removed = recurringIncome[i];
  recurringIncome.splice(i,1);
  save('wit_recurring_income', recurringIncome);
  renderIncome();
  toast(`Removed recurring income "${removed.name}"`, false, ()=>{
    recurringIncome.splice(i,0,removed); save('wit_recurring_income', recurringIncome); renderIncome();
  });
}

function currentMonthKey(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function txnMonthKey(dateStr){ return dateStr ? dateStr.slice(0,7) : ''; }
function budgetPeriodStart(mode, date = new Date()){
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if(mode === 'week'){
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  } else start.setDate(1);
  start.setHours(0,0,0,0);
  return start;
}
function budgetPeriodEnd(mode, date = new Date()){
  const end = budgetPeriodStart(mode, date);
  if(mode === 'week') end.setDate(end.getDate() + 6);
  else end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23,59,59,999);
  return end;
}
function transactionInBudgetPeriod(txn, mode, now = new Date()){
  if(!txn.date) return false;
  const date = new Date(`${txn.date}T12:00:00`);
  return date >= budgetPeriodStart(mode, now) && date <= budgetPeriodEnd(mode, now);
}
function money(value){ return `$${Number(value || 0).toFixed(2)}`; }
function setBudgetView(mode){
  budgetViewMode = mode === 'week' ? 'week' : 'month';
  save('wit_budget_view', budgetViewMode);
  renderBudgetSnapshot();
}
function budgetLimitKey(){ return budgetViewMode === 'week' ? 'weekly' : 'monthly'; }
function setBudgetLimits(){
  const current = budgetLimits[budgetLimitKey()] || 0;
  const label = budgetViewMode === 'week' ? 'weekly' : 'monthly';
  const raw = prompt(`Set your ${label} spending limit (enter 0 to clear it):`, current ? String(current) : '');
  if(raw === null) return;
  const limit = Number(raw);
  if(!Number.isFinite(limit) || limit < 0){ toast('Enter a non-negative spending limit.', true); return; }
  budgetLimits[budgetLimitKey()] = Math.round(limit * 100) / 100;
  save('wit_budget_limits', budgetLimits);
  renderBudgetSnapshot();
  toast(limit ? `${label[0].toUpperCase()+label.slice(1)} limit set to ${money(limit)}.` : `${label[0].toUpperCase()+label.slice(1)} limit cleared.`);
}
function renderBudgetSnapshot(){
  const body = document.getElementById('budgetSnapshotBody');
  if(!body) return;
  const now = new Date();
  const periodTxns = transactions.filter(txn => transactionInBudgetPeriod(txn, budgetViewMode, now));
  const income = periodTxns.filter(txn => txn.type === 'income').reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
  const spent = periodTxns.filter(txn => txn.type === 'expense').reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
  const net = income - spent;
  const limit = Number(budgetLimits[budgetLimitKey()] || 0);
  const remaining = limit - spent;
  const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const periodLabel = budgetViewMode === 'week'
    ? `${budgetPeriodStart('week', now).toLocaleDateString(undefined,{month:'short',day:'numeric'})}–${budgetPeriodEnd('week', now).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`
    : now.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  document.getElementById('budgetWeekBtn')?.classList.toggle('active', budgetViewMode === 'week');
  document.getElementById('budgetMonthBtn')?.classList.toggle('active', budgetViewMode === 'month');
  body.innerHTML = `
    <div class="budget-period-label">${budgetViewMode === 'week' ? 'This week' : 'This month'} · ${esc(periodLabel)}</div>
    <div class="budget-snapshot-metrics">
      <div><span>Spent</span><b class="budget-spent">${money(spent)}</b></div>
      <div><span>Income</span><b class="budget-income">${money(income)}</b></div>
      <div><span>Net</span><b class="${net < 0 ? 'budget-negative' : 'budget-net'}">${net < 0 ? '−' : ''}${money(Math.abs(net))}</b></div>
    </div>
    <div class="budget-limit-row">
      <div><span>${limit ? `${money(spent)} of ${money(limit)} limit` : 'No spending limit set'}</span><b>${limit ? `${percent}%` : '—'}</b></div>
      <div class="budget-progress" role="progressbar" aria-label="${budgetViewMode} spending limit" aria-valuemin="0" aria-valuemax="${limit || 1}" aria-valuenow="${spent}"><span style="width:${percent}%;"></span></div>
      <small>${limit ? (remaining >= 0 ? `${money(remaining)} remaining` : `${money(Math.abs(remaining))} over limit`) : 'Set a limit to track spending pace.'}</small>
    </div>`;
}
function ordinalSuffix(n){
  n = Number(n);
  if(n % 10 === 1 && n % 100 !== 11) return 'st';
  if(n % 10 === 2 && n % 100 !== 12) return 'nd';
  if(n % 10 === 3 && n % 100 !== 13) return 'rd';
  return 'th';
}

function exportBudgetCSV(){
  const header = 'Date,Description,Category,Type,Amount\n';
  const rows = transactions
    .slice()
    .sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    .map(t => [t.date, t.description, t.category||'Other', t.type, Number(t.amount).toFixed(2)]
      .map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const blob = new Blob([header + rows], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wit-budget-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Budget CSV downloaded ✓');
}
// Builds a simple grouped-bar SVG (income vs expense) for the last 6 calendar months.
function renderMonthlyTrend(){
  const el = document.getElementById('monthlyTrend');
  if(!el) return;
  const months = [];
  const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleDateString(undefined,{month:'short'}) });
  }
  const totals = months.map(m=>{
    const monthTxns = transactions.filter(t => txnMonthKey(t.date) === m.key);
    const income = monthTxns.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const expense = monthTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    return { ...m, income, expense };
  });
  if(!totals.some(t=>t.income || t.expense)){el.innerHTML='<div class="empty-note">Add a transaction to see your spending trend.</div>';return;}
  const maxVal = Math.max(1, ...totals.map(t => Math.max(t.income, t.expense)));
  const chartH = 90, barW = 16, gap = 10, groupGap = 26;
  const groupW = barW*2 + gap;
  const width = totals.length * (groupW + groupGap);
  let bars = '';
  totals.forEach((t,i)=>{
    const x = i * (groupW + groupGap);
    const incH = (t.income / maxVal) * chartH;
    const expH = (t.expense / maxVal) * chartH;
    bars += `<rect x="${x}" y="${chartH-incH}" width="${barW}" height="${incH}" fill="#2cafc5" rx="2"><title>${t.label} income: $${t.income.toFixed(2)}</title></rect>`;
    bars += `<rect x="${x+barW+gap}" y="${chartH-expH}" width="${barW}" height="${expH}" fill="#e7202b" rx="2"><title>${t.label} expenses: $${t.expense.toFixed(2)}</title></rect>`;
    bars += `<text x="${x+barW+gap/2}" y="${chartH+16}" font-size="10" fill="#8fa0b3" text-anchor="middle" font-family="IBM Plex Mono, monospace">${t.label}</text>`;
  });
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;overflow-x:auto;">
      <svg width="${width}" height="${chartH+28}" viewBox="0 0 ${width} ${chartH+28}">${bars}</svg>
      <div style="font-size:11px;color:var(--muted);white-space:nowrap;">
        <div><span class="pie-swatch" style="background:#2cafc5;"></span> Income</div>
        <div style="margin-top:4px;"><span class="pie-swatch" style="background:#e7202b;"></span> Expenses</div>
      </div>
    </div>`;
}
function renderBudget(){
  renderBudgetSnapshot();
  renderBudgetSummary();
  renderSimIncomeInput();
  updateSimModeButtons();
  renderSimCategories();   // also renders the simulated summary
  renderSpendingBreakdown();
  renderRecurring();
  renderIncome();
  renderTransactions();
  renderMonthlyTrend();
}

function renderBudgetSummary(){
  const mk = currentMonthKey();
  const monthTxns = transactions.filter(t => txnMonthKey(t.date) === mk);
  const income = monthTxns.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount), 0);
  const expense = monthTxns.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
  const balance = income - expense;
  document.getElementById('budgetSummary').innerHTML = `
    <div class="budget-pill income"><div class="label">Income (this month)</div><div class="value">$${income.toFixed(2)}</div></div>
    <div class="budget-pill expense"><div class="label">Expenses (this month)</div><div class="value">$${expense.toFixed(2)}</div></div>
    <div class="budget-pill balance"><div class="label">Balance</div><div class="value">$${balance.toFixed(2)}</div></div>`;

}

/* ---- Spending breakdown: pie chart toggling Actual vs Simulated ---- */
const PIE_COLORS = ['#3d38c7','#2cafc5','#ffc708','#6f6ae0','#e7202b','#8fa0b3'];

function polarToCartesian(cx, cy, r, angleDeg){
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle){
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = (endAngle - startAngle) <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}
// Builds a simple SVG pie chart + legend from [{label, value}], no chart library needed.
function buildPieSVG(dataArr){
  const total = dataArr.reduce((s,d) => s + d.value, 0);
  if(total <= 0) return '<div class="empty-note">No data to chart.</div>';
  const cx = 90, cy = 90, r = 80;
  let angle = 0;
  let paths = '';
  const legendItems = [];
  dataArr.forEach((d,i)=>{
    const color = PIE_COLORS[i % PIE_COLORS.length];
    const slice = (d.value / total) * 360;
    // Full circle can't be drawn as a single arc path — render as a full circle instead.
    if(dataArr.length === 1){
      paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"><title>${esc(d.label)}: $${d.value.toFixed(2)}</title></circle>`;
    } else {
      const path = describeArc(cx, cy, r, angle, angle + slice);
      paths += `<path d="${path}" fill="${color}"><title>${esc(d.label)}: $${d.value.toFixed(2)}</title></path>`;
    }
    angle += slice;
    const pct = Math.round((d.value/total)*100);
    legendItems.push(`<div class="pie-legend-item"><span class="pie-swatch" style="background:${color}"></span>${esc(d.label)} — $${d.value.toFixed(2)} (${pct}%)</div>`);
  });
  return `<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
    <svg width="150" height="150" viewBox="0 0 180 180">${paths}</svg>
    <div>${legendItems.join('')}</div>
  </div>`;
}

let pieViewMode = 'actual';
function setPieViewMode(mode){
  pieViewMode = mode;
  renderSpendingBreakdown();
}
function renderSpendingBreakdown(){
  document.getElementById('pieToggleActual').classList.toggle('active', pieViewMode === 'actual');
  document.getElementById('pieToggleSimulated').classList.toggle('active', pieViewMode === 'simulated');
  updateTabIndicator(document.querySelector('.pie-toggle'));

  let dataArr;
  if(pieViewMode === 'actual'){
    const mk = currentMonthKey();
    const monthExpenses = transactions.filter(t => t.type === 'expense' && txnMonthKey(t.date) === mk);
    const totals = {};
    monthExpenses.forEach(t => {
      const cat = t.category || 'Other';
      totals[cat] = (totals[cat] || 0) + Number(t.amount);
    });
    dataArr = Object.entries(totals)
      .map(([label,value]) => ({label, value}))
      .sort((a,b) => b.value - a.value);
  } else {
    dataArr = computeSimRows()
      .filter(r => r.amount > 0)
      .map(r => ({label: r.name, value: r.amount}))
      .sort((a,b) => b.value - a.value);
  }

  const el = document.getElementById('categoryList');
  if(dataArr.length === 0){
    el.innerHTML = `<div class="empty-note">${pieViewMode === 'actual' ? 'No expenses logged this month.' : 'Add simulated categories below to see a breakdown.'}</div>`;
    return;
  }
  el.innerHTML = buildPieSVG(dataArr);
}

/* ---- Simulated Expenses: plan a month's spending from income + category splits ---- */
let simBudget = load('wit_simBudget', {
  income: 0,
  mode: 'percent', // 'percent' or 'dollar'
  categories: [
    {name:'Food', value:20},
    {name:'Subscriptions', value:8},
    {name:'Clothes', value:10},
    {name:'Savings', value:25},
    {name:'Other', value:37}
  ]
});
// Turns the raw category inputs (which are either % of income or flat $ amounts,
// depending on mode) into a consistent {name, amount, pct} shape for display.
function computeSimRows(){
  const income = Number(simBudget.income) || 0;
  return simBudget.categories.map(cat=>{
    let amount, pct;
    if(simBudget.mode === 'percent'){
      pct = Number(cat.value) || 0;
      amount = income * pct / 100;
    } else {
      amount = Number(cat.value) || 0;
      pct = income ? (amount / income * 100) : 0;
    }
    return {name: cat.name, amount, pct};
  });
}
function renderSimIncomeInput(){
  document.getElementById('simIncome').value = simBudget.income;
}
function updateSimModeButtons(){
  document.getElementById('simModePercent').classList.toggle('active', simBudget.mode === 'percent');
  document.getElementById('simModeDollar').classList.toggle('active', simBudget.mode === 'dollar');
  updateTabIndicator(document.querySelector('.sim-mode-toggle'));
}
// Income changes affect every row's computed $/% but not the row inputs
// themselves, so just refresh the computed labels + summary in place —
// rebuilding the whole list here would steal focus while typing.
function updateSimIncome(val){
  simBudget.income = parseFloat(val) || 0;
  save('wit_simBudget', simBudget);
  refreshSimComputedDisplay();
}
// Switching between % and $ mode converts each category's stored value so
// it represents the same actual dollar amount either way (e.g. "20%" of a
// $800 income becomes "$160" when switching to $ mode, not a bare "20").
function setSimMode(mode){
  if(mode === simBudget.mode) return;
  const rows = computeSimRows();
  simBudget.categories.forEach((cat,i)=>{
    const row = rows[i];
    cat.value = mode === 'percent' ? Math.round(row.pct * 10) / 10 : Math.round(row.amount * 100) / 100;
  });
  simBudget.mode = mode;
  save('wit_simBudget', simBudget);
  updateSimModeButtons();
  renderSimCategories();
}
function renderSimCategories(){
  const rows = computeSimRows();
  const el = document.getElementById('simCategoryList');
  const unit = simBudget.mode === 'percent' ? '%' : '$';
  el.innerHTML = simBudget.categories.map((cat,i)=>{
    const row = rows[i];
    return `<div class="sim-row">
      <input class="sim-input" type="text" value="${esc(cat.name)}" onchange="editSimCategoryName(${i},this.value)">
      <input class="sim-input" type="number" step="0.01" value="${cat.value}" placeholder="${unit}" oninput="updateSimValue(${i},this.value)">
      <span class="sim-computed" id="simComputed${i}">= $${row.amount.toFixed(2)} (${row.pct.toFixed(0)}%)</span>
      <button class="del-btn" onclick="deleteSimCategory(${i})">✕</button>
    </div>`;
  }).join('');

  renderSimSummary();
}
// Updates just the computed "= $X (Y%)" labels and the summary pills without
// touching any <input>, so typing in a category's value field doesn't lose
// focus/cursor position on every keystroke.
function refreshSimComputedDisplay(){
  const rows = computeSimRows();
  rows.forEach((row,i)=>{
    const span = document.getElementById('simComputed' + i);
    if(span) span.textContent = `= $${row.amount.toFixed(2)} (${row.pct.toFixed(0)}%)`;
  });
  renderSimSummary();
}
// Called on every keystroke in a category's value field.
function updateSimValue(i, val){
  simBudget.categories[i].value = parseFloat(val) || 0;
  save('wit_simBudget', simBudget);
  refreshSimComputedDisplay();
}
// Called on blur of a category's name field (renaming is infrequent, so a
// full rebuild here is fine and keeps the row's data-index in sync).
function editSimCategoryName(i, val){
  simBudget.categories[i].name = val.trim() || simBudget.categories[i].name;
  save('wit_simBudget', simBudget);
  renderSimCategories();
}
function renderSimSummary(){
  const rows = computeSimRows();
  const income = Number(simBudget.income) || 0;
  const totalAllocated = rows.reduce((s,r) => s + r.amount, 0);
  const remaining = income - totalAllocated;
  document.getElementById('simSummary').innerHTML = `
    <div class="budget-pill"><div class="label">Total Allocated</div><div class="value">$${totalAllocated.toFixed(2)}</div></div>
    <div class="budget-pill ${remaining < 0 ? 'expense' : 'income'}">
      <div class="label">${remaining < 0 ? 'Over Budget' : 'Remaining'}</div>
      <div class="value">$${Math.abs(remaining).toFixed(2)}</div>
    </div>`;
  if(pieViewMode === 'simulated') renderSpendingBreakdown();
}
function addSimCategory(){
  simBudget.categories.push({name:'New category', value:0});
  save('wit_simBudget', simBudget);
  renderSimCategories();
}
function deleteSimCategory(i){
  const removed = simBudget.categories[i];
  simBudget.categories.splice(i,1);
  save('wit_simBudget', simBudget);
  renderSimCategories();
  toast(`Removed "${removed.name}"`, false, ()=>{
    simBudget.categories.splice(i,0,removed); save('wit_simBudget', simBudget); renderSimCategories();
  });
}

function renderRecurring(){
  const el = document.getElementById('recurringList');
  if(recurringBills.length === 0){
    el.innerHTML = '<div class="empty-note">No recurring bills added.</div>';
    return;
  }
  el.innerHTML = recurringBills.map((b,i)=>`
    <div class="recurring-row" data-idx="${i}">
      <span contenteditable="true" onblur="editBill(${i},'name',this.textContent)">${esc(b.name)}</span>
      <span style="display:flex;align-items:center;gap:6px;">
        <span contenteditable="true" onblur="editBill(${i},'amount',this.textContent)">$${Number(b.amount).toFixed(2)}</span>
        <span style="color:var(--muted);">Due ${b.day}${ordinalSuffix(b.day)}</span>
        <button class="del-btn" onclick="deleteBill(${i})">✕</button>
      </span>
    </div>`).join('');

}
function addBill(){
  const name = document.getElementById('billName').value.trim();
  const amount = parseFloat(document.getElementById('billAmount').value);
  const day = parseInt(document.getElementById('billDay').value, 10);
  if(!name || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(day) || day < 1 || day > 31){ toast('Enter a name, positive amount, and due day from 1 to 31.', true); return; }
  recurringBills.push({name, amount, day: isNaN(day) ? 1 : day});
  save('wit_recurring', recurringBills); renderRecurring();
  document.getElementById('billName').value = '';
  document.getElementById('billAmount').value = '';
  document.getElementById('billDay').value = '';
  toggleForm('billForm');
  highlightEl(document.querySelectorAll('#recurringList .recurring-row')[recurringBills.length-1]);
}
function editBill(i, field, val){
  if(field === 'amount'){
    const parsed = parseFloat(String(val).replace(/[^0-9.]/g,''));
    recurringBills[i].amount = isNaN(parsed) ? recurringBills[i].amount : parsed;
  } else {
    recurringBills[i][field] = val.trim();
  }
  save('wit_recurring', recurringBills); renderRecurring();
}
function deleteBill(i){
  const removed = recurringBills[i];
  recurringBills.splice(i,1);
  save('wit_recurring', recurringBills); renderRecurring();
  toast(`Removed recurring bill "${removed.name}"`, false, ()=>{
    recurringBills.splice(i,0,removed); save('wit_recurring', recurringBills); renderRecurring();
  });
}

function renderTransactions(){
  const el = document.getElementById('transactionList');
  if(transactions.length === 0){
    el.innerHTML = '<div class="empty-note">No transactions logged yet.</div>';
    return;
  }
  const sorted = transactions
    .map((t, idx) => ({...t, _idx: idx}))
    .sort((a,b) => (b.date||'').localeCompare(a.date||''));
  el.innerHTML = sorted.map(t=>{
    const sign = t.type === 'income' ? '+' : '−';
    return `<div class="txn-row" data-idx="${t._idx}">
      <span>${fmtDeadlineDate(t.date)} · ${esc(t.description)} <span style="color:var(--muted);">(${esc(t.category||'Other')})</span></span>
      <span style="display:flex;align-items:center;gap:8px;">
        <span class="txn-amount ${t.type}">${sign}$${Number(t.amount).toFixed(2)}</span>
        <button class="del-btn" onclick="deleteTransaction(${t._idx})">✕</button>
      </span>
    </div>`;
  }).join('');

}
function addTransaction(){
  const date = document.getElementById('txnDate').value || todayISO();
  const description = document.getElementById('txnDesc').value.trim();
  const category = document.getElementById('txnCategory').value.trim() || 'Other';
  const amount = parseFloat(document.getElementById('txnAmount').value);
  const type = document.getElementById('txnType').value;
  if(!description || !Number.isFinite(amount) || amount <= 0){ toast('Enter a description and an amount greater than zero.', true); return; }
  transactions.push({date, description, category, amount, type});
  save('wit_transactions', transactions);
  renderBudget();
  document.getElementById('txnDesc').value = '';
  document.getElementById('txnCategory').value = '';
  document.getElementById('txnAmount').value = '';
  toggleForm('txnForm');
  highlightEl(document.querySelector('#transactionList .txn-row'));
}
function deleteTransaction(i){
  const removed = transactions[i];
  transactions.splice(i,1);
  save('wit_transactions', transactions);
  renderBudget();
  toast(`Deleted "${removed.description}" ($${Number(removed.amount).toFixed(2)})`, false, ()=>{
    transactions.push(removed); save('wit_transactions', transactions); renderBudget();
  });
}
refreshWeeklyIncome();
renderBudget();

/* ============ Schedule modal (Day / Week / Month / Year) ============ */
function localISO(date){
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function sameDay(a,b){ return localISO(a) === localISO(b); }

// Does a (possibly recurring) event land on this date? A plain one-off
// event (recurrence null/'none') just checks date equality — the same
// behavior as before recurrence existed. A recurring event checks the
// frequency/interval pattern, respects an "until" cutoff directly, and
// for a "count" cutoff walks forward from the start date to work out
// which occurrence number this date would be (bounded loops only, no
// unbounded recursion, so a bad interval can't hang the page).
function eventOccursOnDate(ev, date){
  if(!ev.date) return false;
  const iso = localISO(date);
  if(iso < ev.date) return false;
  if(ev.exceptions && ev.exceptions.includes(iso)) return false;
  const rec = ev.recurrence;
  if(!rec || !rec.freq || rec.freq === 'none') return iso === ev.date;

  const interval = Math.max(1, parseInt(rec.interval, 10) || 1);
  const start = new Date(ev.date + 'T00:00:00');
  const cur = new Date(iso + 'T00:00:00');
  if(rec.end && rec.end.type === 'until' && rec.end.date && iso > rec.end.date) return false;
  const countLimit = (rec.end && rec.end.type === 'count') ? Math.max(1, parseInt(rec.end.n, 10) || 1) : null;

  if(rec.freq === 'daily'){
    const diffDays = Math.round((cur - start) / 86400000);
    if(diffDays < 0 || diffDays % interval !== 0) return false;
    if(countLimit !== null && (diffDays / interval) >= countLimit) return false;
    return true;
  }
  if(rec.freq === 'monthly'){
    if(cur.getDate() !== start.getDate()) return false;
    const monthDiff = (cur.getFullYear() - start.getFullYear()) * 12 + (cur.getMonth() - start.getMonth());
    if(monthDiff < 0 || monthDiff % interval !== 0) return false;
    if(countLimit !== null){
      let occurrence=0;
      for(let offset=0;offset<=monthDiff;offset+=interval){
        const candidate=new Date(start.getFullYear(),start.getMonth()+offset,start.getDate());
        if(candidate.getDate()===start.getDate()) occurrence++;
        if(occurrence>countLimit) return false;
      }
    }
    return true;
  }
  if(rec.freq === 'weekly'){
    const byDay = (rec.byDay && rec.byDay.length) ? rec.byDay : [start.getDay()];
    if(!byDay.includes(cur.getDay())) return false;
    const startWeekStart = new Date(start); startWeekStart.setDate(start.getDate() - start.getDay());
    const curWeekStart = new Date(cur); curWeekStart.setDate(cur.getDate() - cur.getDay());
    const weekDiff = Math.round((curWeekStart - startWeekStart) / (7 * 86400000));
    if(weekDiff < 0 || weekDiff % interval !== 0) return false;
    if(countLimit !== null){
      // No closed-form index when specific weekdays are involved — count
      // qualifying days from the start up through `cur` (bounded by the
      // distance between them, so this never runs long).
      let count = 0;
      for(let d = new Date(start); d <= cur; d.setDate(d.getDate() + 1)){
        const dWeekStart = new Date(d); dWeekStart.setDate(d.getDate() - d.getDay());
        const dWeekDiff = Math.round((dWeekStart - startWeekStart) / (7 * 86400000));
        if(dWeekDiff >= 0 && dWeekDiff % interval === 0 && byDay.includes(d.getDay())){
          if(sameDay(d, cur)) return count < countLimit;
          count++;
        }
      }
      return false;
    }
    return true;
  }
  return false;
}
function to12h(hhmm){
  if(!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if(isNaN(h) || isNaN(m)) return '';
  return new Date(2000,0,1,h,m).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
const RECUR_DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function summarizeRecurrence(rec){
  if(!rec || !rec.freq || rec.freq === 'none') return '';
  const interval = Math.max(1, parseInt(rec.interval, 10) || 1);
  const unitWord = { daily:'daily', weekly:'weekly', monthly:'monthly' }[rec.freq];
  const unitPlural = { daily:'days', weekly:'weeks', monthly:'months' }[rec.freq];
  let base = interval > 1 ? `every ${interval} ${unitPlural}` : unitWord;
  if(rec.freq === 'weekly' && rec.byDay && rec.byDay.length){
    base += ' on ' + rec.byDay.slice().sort().map(d => RECUR_DAY_ABBR[d]).join('/');
  }
  let end = '';
  if(rec.end){
    if(rec.end.type === 'until' && rec.end.date) end = ` until ${fmtDeadlineDate(rec.end.date)}`;
    else if(rec.end.type === 'count' && rec.end.n) end = `, ${rec.end.n}×`;
  }
  return `↻ Repeats ${base}${end}`;
}
function getEventsForDate(date){
  const classesForDay = schedule.length ? computeOccurrencesForDate(schedule, date) : [];
  const iso = localISO(date);
  const deadlinesForDay = deadlines.filter(d => d.date === iso);
  const activitiesForDay = events.filter(e => eventOccursOnDate(e, date))
    .slice()
    .sort((a,b) => (a.time||'').localeCompare(b.time||''));
  return { classesForDay, deadlinesForDay, activitiesForDay };
}

let scheduleViewState = { view: 'month', date: new Date() };

function openScheduleModal(){
  scheduleViewState.date = new Date();
  showOverlay('scheduleOverlay');
  renderScheduleView();
}
function closeScheduleModal(){
  hideOverlay('scheduleOverlay');
}

/* ---- "+ Add Event" form (Schedule modal): title/date/time plus optional
   recurrence — daily/weekly/monthly, specific weekdays, and an end
   condition (never / on a date / after N occurrences), similar in spirit
   to a Google Calendar "custom recurrence" picker but kept to one screen. */
let evSelectedDays = new Set();
function toggleAddEventForm(){
  const form = document.getElementById('addEventForm');
  const opening = !form.classList.contains('open');
  if(opening){
    editingEventId = null;
    const submitBtn = document.getElementById('evFormSubmitBtn');
    if(submitBtn) submitBtn.textContent = 'Add to Calendar';
    document.getElementById('evTitle').value = '';
    document.getElementById('evDate').value = localISO(scheduleViewState.date || new Date());
    document.getElementById('evStartTime').value = '';
    document.getElementById('evEndTime').value = '';
    document.getElementById('evRepeat').value = 'none';
    document.getElementById('evInterval').value = '1';
    document.getElementById('evEndType').value = 'never';
    document.getElementById('evEndUntil').value = '';
    document.getElementById('evEndCount').value = '10';
    // Left empty on purpose: if the user never touches the weekday chips,
    // eventOccursOnDate() falls back to whatever weekday the Date field
    // ends up set to. Pre-selecting a day here would go stale the moment
    // they changed the date after opening the form.
    evSelectedDays = new Set();
    renderEventFormConditionals();
  } else {
    editingEventId = null;
    const submitBtn = document.getElementById('evFormSubmitBtn');
    if(submitBtn) submitBtn.textContent = 'Add to Calendar';
  }
  toggleForm('addEventForm');
  if(opening) setTimeout(()=> document.getElementById('evTitle').focus(), 50);
}
function renderByDayChips(){
  const el = document.getElementById('evByDayRow');
  el.innerHTML = RECUR_DAY_ABBR.map((label,d)=>
    `<button type="button" class="ics-btn" style="padding:4px 9px;font-size:10.5px;${evSelectedDays.has(d) ? 'background:var(--wit-teal);color:#0b1218;border-color:var(--wit-teal);' : ''}" onclick="toggleByDay(${d})">${label}</button>`
  ).join('');
}
function toggleByDay(d){
  if(evSelectedDays.has(d)) evSelectedDays.delete(d); else evSelectedDays.add(d);
  renderByDayChips();
}
// Shows/hides the interval, weekday-picker, and "ends" rows based on the
// current Repeat selection, and keeps the "every N ___" unit label in
// sync with it. Called on open and whenever Repeat or End-type changes.
function renderEventFormConditionals(){
  const repeat = document.getElementById('evRepeat').value;
  const repeats = repeat !== 'none';
  document.getElementById('evIntervalRow').style.display = repeats ? 'flex' : 'none';
  document.getElementById('evByDayRow').style.display = repeat === 'weekly' ? 'flex' : 'none';
  document.getElementById('evByDayHint').style.display = repeat === 'weekly' ? 'block' : 'none';
  document.getElementById('evEndRow').style.display = repeats ? 'flex' : 'none';
  const unitLabel = { daily:'day(s)', weekly:'week(s)', monthly:'month(s)' }[repeat] || 'day(s)';
  document.getElementById('evIntervalUnit').textContent = unitLabel;
  if(repeat === 'weekly') renderByDayChips();
  const endType = document.getElementById('evEndType').value;
  document.getElementById('evEndUntil').style.display = endType === 'until' ? 'inline-block' : 'none';
  document.getElementById('evEndCount').style.display = endType === 'count' ? 'inline-block' : 'none';
}
function submitEventForm(){
  const title = document.getElementById('evTitle').value.trim();
  const date = document.getElementById('evDate').value || todayISO();
  if(!title){ toast('Give the event a title first.', true); return; }
  const rawStart = document.getElementById('evStartTime').value;
  const rawEnd = document.getElementById('evEndTime').value;
  if(rawEnd && (!rawStart || rawEnd <= rawStart)){ toast('End time must be after the start time.', true); return; }
  const time = to12h(rawStart);
  const endTime = to12h(rawEnd);

  const repeat = document.getElementById('evRepeat').value;
  let recurrence = null;
  if(repeat !== 'none'){
    const interval = Math.max(1, parseInt(document.getElementById('evInterval').value, 10) || 1);
    const endType = document.getElementById('evEndType').value;
    let end = { type: 'never' };
    if(endType === 'until'){
      const untilDate = document.getElementById('evEndUntil').value;
      if(untilDate && untilDate < date){toast('The repeat end date must be on or after the start date.', true);return;}
      if(untilDate) end = { type:'until', date: untilDate };
    } else if(endType === 'count'){
      const n = Math.max(1, parseInt(document.getElementById('evEndCount').value, 10) || 10);
      end = { type:'count', n };
    }
    recurrence = { freq: repeat, interval, end };
    if(repeat === 'weekly') recurrence.byDay = evSelectedDays.size ? Array.from(evSelectedDays).sort() : null;
  }

  const wasEditing = !!editingEventId;
  let ev;
  if(wasEditing){
    const idx = events.findIndex(e => e.id === editingEventId);
    if(idx === -1){
      toast('Could not find that event to update — it may have been deleted.', true);
      editingEventId = null;
      return;
    }
    ev = Object.assign({}, events[idx], { date, time, endTime, title, recurrence });
    events[idx] = ev;
    save('wit_events', events);
    editingEventId = null;
  } else {
    ev = addEvent(date, time, title, { endTime, recurrence });
  }
  toggleAddEventForm();
  renderScheduleView();
  const recurNote = summarizeRecurrence(recurrence);
  toast(`${wasEditing ? 'Updated' : 'Added to calendar'}: ${title} — ${fmtDeadlineDate(date)}${time ? ' at ' + time : ''}${recurNote ? ' · ' + recurNote : ''}`);
  scheduleViewState.date = new Date(date + 'T00:00:00');
  scheduleViewState.view = 'day';
  renderScheduleView();
  const cards = document.querySelectorAll('#scheduleBody .class-card');
  highlightEl(Array.from(cards).find(c => c.textContent.includes(title)) || cards[cards.length-1]);
  void ev;
}
function setScheduleView(view){
  scheduleViewState.view = view;
  renderScheduleView();
}
function navigateSchedule(delta){
  const d = new Date(scheduleViewState.date);
  if(scheduleViewState.view === 'day') d.setDate(d.getDate() + delta);
  else if(scheduleViewState.view === 'week') d.setDate(d.getDate() + delta*7);
  else if(scheduleViewState.view === 'month'){ d.setDate(1); d.setMonth(d.getMonth() + delta); }
  else if(scheduleViewState.view === 'year'){ d.setDate(1); d.setFullYear(d.getFullYear() + delta); }
  scheduleViewState.date = d;
  renderScheduleView();
}
function goToToday(){
  scheduleViewState.date = new Date();
  renderScheduleView();
}
function jumpToDate(y, m, day, view){
  scheduleViewState.date = new Date(y, m, day);
  scheduleViewState.view = view || 'day';
  renderScheduleView();
}

function renderScheduleView(){
  document.querySelectorAll('#scheduleOverlay .view-tab').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.view === scheduleViewState.view);
  });
  updateTabIndicator(document.querySelector('#scheduleOverlay .view-tabs'));
  const label = document.getElementById('periodLabel');
  const body = document.getElementById('scheduleBody');
  const d = scheduleViewState.date;

  if(scheduleViewState.view === 'day'){
    label.textContent = d.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric', year:'numeric'});
    body.innerHTML = renderDayAgenda(d);
  } else if(scheduleViewState.view === 'week'){
    const start = new Date(d); start.setDate(start.getDate() - start.getDay());
    const end = new Date(start); end.setDate(end.getDate() + 6);
    label.textContent = `${start.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${end.toLocaleDateString(undefined,{month:'short',day:'numeric', year:'numeric'})}`;
    body.innerHTML = renderWeekGrid(start);
  } else if(scheduleViewState.view === 'month'){
    label.textContent = d.toLocaleDateString(undefined,{month:'long', year:'numeric'});
    body.innerHTML = renderMonthGrid(d);
  } else if(scheduleViewState.view === 'year'){
    label.textContent = String(d.getFullYear());
    body.innerHTML = renderYearGrid(d);
  }
}

function findFreeBlocksForDay(classesForDay){
  // Only classes with a parseable start/end time can be used to compute gaps.
  const ranges = classesForDay
    .map(c => parseTimeRangeToday(c.time))
    .filter(Boolean)
    .sort((a,b) => a.start - b.start);
  if(ranges.length === 0) return [];

  const dayStart = new Date(ranges[0].start); dayStart.setHours(8,0,0,0);
  const dayEnd = new Date(ranges[0].start); dayEnd.setHours(21,0,0,0);
  const MIN_GAP_MIN = 30;
  const free = [];
  let cursor = dayStart;
  ranges.forEach(r=>{
    if(r.start > cursor){
      const gapMin = (r.start - cursor) / 60000;
      if(gapMin >= MIN_GAP_MIN) free.push({ start: new Date(cursor), end: new Date(r.start) });
    }
    if(r.end > cursor) cursor = r.end;
  });
  if(dayEnd > cursor){
    const gapMin = (dayEnd - cursor) / 60000;
    if(gapMin >= MIN_GAP_MIN) free.push({ start: new Date(cursor), end: new Date(dayEnd) });
  }
  return free;
}
function fmtClock(d){
  return d.toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'});
}
function renderDayAgenda(date){
  const { classesForDay, deadlinesForDay, activitiesForDay } = getEventsForDate(date);
  const iso = localISO(date);
  if(classesForDay.length === 0 && deadlinesForDay.length === 0 && activitiesForDay.length === 0){
    return '<div class="empty-note">Nothing scheduled for this day.</div>';
  }
  let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
  classesForDay.forEach(c=>{
    html += `<div class="class-card" style="position:static;">
      <div class="time">${esc(c.time)}</div>
      <div class="name">${esc(c.name)}</div>
      <div class="room">${esc(c.room)}</div>
    </div>`;
  });
  activitiesForDay.forEach((ev)=>{
    const idx = events.indexOf(ev);
    const timeLabel = ev.time ? (ev.endTime ? `${ev.time} – ${ev.endTime}` : ev.time) : 'All day';
    const recurLabel = summarizeRecurrence(ev.recurrence);
    const isRecurring = ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none';
    // Recurring events get three distinct actions (skip just today / stop
    // repeating from today on / wipe the whole series) — matching how a
    // real calendar separates "this one" from "this and following" from
    // "all". A plain one-off event just gets edit + delete, as before.
    const actionsHtml = isRecurring ? `
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        <button class="icon-btn" style="width:auto;padding:0 8px;gap:4px;" onclick="openEditEventForm(${idx})" title="Edit the whole series">✎ Edit</button>
        <button class="icon-btn" style="width:auto;padding:0 8px;gap:4px;" onclick="skipEventOccurrence(${idx},'${iso}')" title="Skip just this date">⏭ Skip this one</button>
        <button class="icon-btn" style="width:auto;padding:0 8px;gap:4px;" onclick="endRecurrenceHere(${idx},'${iso}')" title="Stop repeating after this date">⏹ End series</button>
        <button class="del-btn" onclick="deleteEvent(${idx})" title="Delete every occurrence, past and future" aria-label="Delete entire series: ${esc(ev.title)}">✕ All</button>
      </div>` : `
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="icon-btn" style="width:auto;padding:0 8px;gap:4px;" onclick="openEditEventForm(${idx})" title="Edit" aria-label="Edit ${esc(ev.title)}">✎ Edit</button>
      </div>`;
    html += `<div class="class-card" style="position:relative;">
      ${!isRecurring ? `<button class="del-btn" style="position:absolute;top:4px;right:4px;" onclick="deleteEvent(${idx})" aria-label="Delete ${esc(ev.title)}">✕</button>` : ''}
      <div class="time">${esc(timeLabel)}</div>
      <div class="name">${esc(ev.title)}</div>
      ${recurLabel ? `<div class="room">${esc(recurLabel)}</div>` : ''}
      ${actionsHtml}
    </div>`;
  });
  deadlinesForDay.forEach(dl=>{
    html += `<div class="deadline">
      <div class="date">DUE</div>
      <div class="info"><b>${esc(dl.title)}</b>${dl.link ? ` <a href="${esc(dl.link)}" target="_blank" rel="noopener noreferrer">View</a>` : ''}</div>
    </div>`;
  });
  const freeBlocks = findFreeBlocksForDay(classesForDay);
  if(freeBlocks.length){
    html += '<div style="margin-top:4px;"><div style="font:700 11px \'IBM Plex Mono\',monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Free time</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    freeBlocks.forEach(b=>{
      const mins = Math.round((b.end - b.start)/60000);
      const dur = mins >= 60 ? `${(mins/60).toFixed(mins%60===0?0:1)}h` : `${mins}m`;
      html += `<span style="background:var(--panel-2);border:1px solid var(--wit-teal);color:var(--wit-teal);border-radius:999px;padding:4px 12px;font:600 12px 'IBM Plex Sans',sans-serif;">Free ${fmtClock(b.start)}–${fmtClock(b.end)} <span style="opacity:.7;">(${dur})</span></span>`;
    });
    html += '</div></div>';
  }
  html += '</div>';
  return html;
}

function renderWeekGrid(start){
  const today = new Date();
  let html = '<div class="week-grid">';
  for(let i=0;i<7;i++){
    const day = new Date(start); day.setDate(start.getDate() + i);
    const { classesForDay, deadlinesForDay, activitiesForDay } = getEventsForDate(day);
    const isToday = sameDay(day, today);
    html += `<div class="week-day ${isToday?'today':''}" onclick="jumpToDate(${day.getFullYear()},${day.getMonth()},${day.getDate()},'day')">
      <div class="week-day-num">${day.toLocaleDateString(undefined,{weekday:'short'})} ${day.getDate()}</div>`;
    classesForDay.slice(0,3).forEach(c=>{ html += `<div class="mini-event">${esc(c.name)}</div>`; });
    if(classesForDay.length > 3) html += `<div class="mini-event">+${classesForDay.length-3} more</div>`;
    activitiesForDay.forEach(ev=>{ html += `<div class="mini-event">${ev.time ? esc(ev.time) + ' — ' : ''}${esc(ev.title)}</div>`; });
    deadlinesForDay.forEach(dl=>{ html += `<div class="mini-event deadline">Due: ${esc(dl.title)}</div>`; });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderMonthGrid(refDate){
  const year = refDate.getFullYear(), month = refDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDay = new Date(firstOfMonth); startDay.setDate(startDay.getDate() - startDay.getDay());
  const today = new Date();
  let html = '<div class="month-grid">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    html += `<div style="font-size:10px;color:var(--muted);text-align:center;">${d}</div>`;
  });
  for(let i=0;i<42;i++){
    const day = new Date(startDay); day.setDate(startDay.getDate() + i);
    const inMonth = day.getMonth() === month;
    const { classesForDay, deadlinesForDay, activitiesForDay } = getEventsForDate(day);
    const isToday = sameDay(day, today);
    html += `<div class="month-day ${inMonth?'':'other-month'} ${isToday?'today':''}" onclick="jumpToDate(${day.getFullYear()},${day.getMonth()},${day.getDate()},'day')">
      <div class="month-day-num">${day.getDate()}</div>`;
    if(classesForDay.length) html += `<span class="badge">${classesForDay.length} class${classesForDay.length>1?'es':''}</span>`;
    if(activitiesForDay.length) html += `<span class="badge" style="background:rgba(44,175,197,.18);color:var(--wit-teal);">${activitiesForDay.length} event${activitiesForDay.length>1?'s':''}</span>`;
    if(deadlinesForDay.length) html += `<span class="dot"></span>`;
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderYearGrid(refDate){
  const year = refDate.getFullYear();
  const today = new Date();
  let html = '<div class="year-grid">';
  for(let m=0;m<12;m++){
    const monthDate = new Date(year, m, 1);
    html += `<div class="mini-month"><div class="mini-month-title">${monthDate.toLocaleDateString(undefined,{month:'long'})}</div><div class="mini-month-grid">`;
    const startDay = new Date(monthDate); startDay.setDate(startDay.getDate() - startDay.getDay());
    for(let i=0;i<42;i++){
      const day = new Date(startDay); day.setDate(startDay.getDate() + i);
      if(day.getMonth() !== m){ html += '<div class="mini-day other-month">.</div>'; continue; }
      const { classesForDay, deadlinesForDay, activitiesForDay } = getEventsForDate(day);
      const hasEvent = classesForDay.length > 0 || deadlinesForDay.length > 0 || activitiesForDay.length > 0;
      const isToday = sameDay(day, today);
      html += `<div class="mini-day ${hasEvent?'has-event':''} ${isToday?'today':''}" onclick="jumpToDate(${day.getFullYear()},${day.getMonth()},${day.getDate()},'day')">${day.getDate()}</div>`;
    }
    html += '</div></div>';
  }
  html += '</div>';
  return html;
}

/* ============ Welcome name persistence ============ */
const nameEl = document.getElementById('welcomeName');
nameEl.textContent = localStorage.getItem('wit_name') || 'ALEX J.';
nameEl.addEventListener('blur', ()=> localStorage.setItem('wit_name', nameEl.textContent.trim()));
if(typeof scheduleCloudPush === 'function'){
  nameEl.addEventListener('blur', ()=> scheduleCloudPush());
}

/* ============ Cross-device sync via an encrypted GitHub Gist ============ */
// Data is encrypted client-side (PBKDF2 -> AES-GCM) with a passphrase before
// ever leaving the browser. A GitHub personal access token (scoped only to
// "gist") is used purely as storage — it never sees the plaintext data.
const GIST_FILENAME = 'wit-dashboard-sync.json';

function randomBytes(n){ return crypto.getRandomValues(new Uint8Array(n)); }
function toB64(bytes){ return btoa(String.fromCharCode(...bytes)); }
function fromB64(b64){ return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }

async function deriveSyncKey(passphrase, saltBytes){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), {name:'PBKDF2'}, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt: saltBytes, iterations: 100000, hash:'SHA-256'},
    keyMaterial,
    {name:'AES-GCM', length:256},
    false,
    ['encrypt','decrypt']
  );
}
async function encryptForSync(obj, key, saltB64){
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(obj));
  const cipherBuf = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, plaintext);
  return { v:1, salt: saltB64, iv: toB64(iv), data: toB64(new Uint8Array(cipherBuf)) };
}
async function decryptForSync(payload, key){
  const iv = fromB64(payload.iv);
  const cipherBytes = fromB64(payload.data);
  const plainBuf = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, cipherBytes);
  return JSON.parse(new TextDecoder().decode(plainBuf));
}

function ghHeaders(token){
  return { 'Authorization':'token ' + token, 'Accept':'application/vnd.github+json', 'Content-Type':'application/json' };
}
async function githubFindGist(token){
  const res = await fetch('https://api.github.com/gists', { headers: ghHeaders(token) });
  if(!res.ok) throw new Error('Could not list gists (status ' + res.status + ')');
  const gists = await res.json();
  const found = gists.find(g => g.files && g.files[GIST_FILENAME]);
  return found ? found.id : null;
}
async function githubCreateGist(token, content){
  const res = await fetch('https://api.github.com/gists', {
    method:'POST', headers: ghHeaders(token),
    body: JSON.stringify({ description:'WIT Dashboard sync data (encrypted)', public:false, files: { [GIST_FILENAME]: { content } } })
  });
  if(!res.ok) throw new Error('Could not create gist (status ' + res.status + ')');
  const g = await res.json();
  return g.id;
}
async function githubGetGistContent(token, gistId){
  const res = await fetch('https://api.github.com/gists/' + gistId, { headers: ghHeaders(token) });
  if(!res.ok) throw new Error('Could not read gist (status ' + res.status + ')');
  const g = await res.json();
  const file = g.files[GIST_FILENAME];
  return file ? file.content : null;
}
async function githubPatchGist(token, gistId, content){
  const res = await fetch('https://api.github.com/gists/' + gistId, {
    method:'PATCH', headers: ghHeaders(token),
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content } } })
  });
  if(!res.ok) throw new Error('Could not update gist (status ' + res.status + ')');
}

// Gathers every synced section into one bundle for pushing to the cloud.
function gatherState(){
  return {
    links, schedule, classes, deadlines, events, coop, todos,
    transactions, budgetViewMode, budgetLimits, recurringBills, simBudget,
    grades, recurringIncome, incomeLog, countdown,
    habits, semester, focusSessions, gpaHistory,
    name: localStorage.getItem('wit_name') || ''
  };
}
// Applies a decrypted cloud bundle to the live in-memory state and re-renders
// everything — no page reload needed.
function validateBundle(bundle){
  if(!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) throw new Error('Expected a dashboard backup object');
  const text = v => typeof v === 'string';
  const number = v => (typeof v === 'number' || typeof v === 'string') && v !== '' && Number.isFinite(Number(v));
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const date = v => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && localISODate(new Date(v+'T12:00:00')) === v;
  const record = (row, fields) => object(row) && Object.entries(fields).every(([key, check])=> row[key] === undefined || check(row[key]));
  const schemas = {
    links: r => record(r,{label:text,url:text}) && text(r.label) && text(r.url),
    classes: r => record(r,{name:text,time:text,room:text,source:text}) && text(r.name),
    schedule: r => record(r,{summary:text,location:text,dtstartISO:text,dtendISO:v=>v===null||text(v),freq:v=>v===null||text(v),byday:v=>Array.isArray(v)&&v.every(text),untilISO:v=>v===null||text(v)}) && text(r.dtstartISO) && !isNaN(Date.parse(r.dtstartISO)) && Array.isArray(r.byday),
    deadlines: r => record(r,{title:text,date:v=>v===''||date(v),link:text,priority:v=>['High','Medium','Low'].includes(v),repeat:text}) && text(r.title),
    events: r => record(r,{id:text,title:text,date,time:text,endTime:text,exceptions:v=>Array.isArray(v)&&v.every(date),recurrence:v=>v===null || record(v,{freq:v=>['none','daily','weekly','monthly'].includes(v),interval:v=>number(v)&&Number(v)>0,byDay:v=>v===null||(Array.isArray(v)&&v.every(d=>Number.isInteger(d)&&d>=0&&d<=6)),end:v=>record(v,{type:v=>['never','until','count'].includes(v),date,n:v=>number(v)&&Number(v)>0})})}) && text(r.title) && text(r.id) && date(r.date),
    coop: r => record(r,{company:text,role:text,link:text,notes:text,status:v=>['Applied','Interviewing','Offer','Rejected'].includes(v)}) && text(r.company),
    todos: r => record(r,{text,done:v=>typeof v==='boolean',category:text}) && text(r.text),
    transactions: r => record(r,{date,description:text,category:text,type:v=>['income','expense'].includes(v),amount:number}) && text(r.description) && number(r.amount),
    recurringBills: r => record(r,{name:text,amount:number,day:v=>number(v)&&Number(v)>=1&&Number(v)<=31}) && text(r.name) && number(r.amount),
    recurringIncome: r => record(r,{name:text,amount:number,weekday:v=>number(v)&&Number(v)>=0&&Number(v)<=6}) && text(r.name) && number(r.amount),
    grades: r => record(r,{name:text,credits:number,percent:v=>v===null||v===''||number(v)}) && text(r.name),
    habits: r => record(r,{name:text,log:v=>object(v)&&Object.values(v).every(x=>typeof x==='boolean')}) && text(r.name) && object(r.log),
    focusSessions: r => record(r,{date,minutes:number}) && date(r.date) && number(r.minutes),
    gpaHistory: r => record(r,{date,gpa:v=>typeof v==='number'&&Number.isFinite(v)}) && date(r.date) && typeof r.gpa==='number'
  };
  let recognized = 0;
  for(const [key,check] of Object.entries(schemas)){
    if(!Object.hasOwn(bundle,key)) continue;
    recognized++;
    if(!Array.isArray(bundle[key]) || !bundle[key].every(check)) throw new Error('Invalid '+key+' section; nothing was imported');
  }
  for(const key of ['incomeLog','countdown','semester','simBudget']){
    if(!Object.hasOwn(bundle,key)) continue;
    recognized++;
    if(!object(bundle[key])) throw new Error('Invalid '+key+' section');
  }
  if(bundle.budgetLimits !== undefined && (!object(bundle.budgetLimits) || !number(bundle.budgetLimits.weekly) || !number(bundle.budgetLimits.monthly) || Number(bundle.budgetLimits.weekly) < 0 || Number(bundle.budgetLimits.monthly) < 0)) throw new Error('Invalid budget limits');
  if(bundle.budgetViewMode !== undefined && !['week','month'].includes(bundle.budgetViewMode)) throw new Error('Invalid budget view');
  if(bundle.incomeLog && !Object.values(bundle.incomeLog).every(text)) throw new Error('Invalid income ledger');
  if(bundle.countdown && (!text(bundle.countdown.label) || !(bundle.countdown.date===''||date(bundle.countdown.date)))) throw new Error('Invalid countdown');
  if(bundle.semester && !['start','end'].every(k=>bundle.semester[k]===''||date(bundle.semester[k]))) throw new Error('Invalid semester');
  if(bundle.simBudget && (!Array.isArray(bundle.simBudget.categories) || !bundle.simBudget.categories.every(r=>record(r,{name:text,value:number})&&text(r.name)))) throw new Error('Invalid simulated budget');
  if(bundle.name !== undefined && !text(bundle.name)) throw new Error('Invalid name');
  if(!recognized) throw new Error('This file contains no dashboard sections');
  return bundle;
}
function applyCloudState(bundle){
  validateBundle(bundle);
  // Commit storage first, rolling back every touched key if storage is full.
  const state = {...gatherState(), ...bundle};
  const keys = {links:'links',schedule:'schedule',classes:'classes',deadlines:'deadlines',events:'events',coop:'coop',todos:'todos',transactions:'transactions',budgetViewMode:'budget_view',budgetLimits:'budget_limits',recurringBills:'recurring',simBudget:'simBudget',grades:'grades',recurringIncome:'recurring_income',incomeLog:'income_log',countdown:'countdown',habits:'habits',semester:'semester',focusSessions:'focus_sessions',gpaHistory:'gpa_history'};
  const previous = new Map();
  try {
    localStorage.setItem('wit_before_restore', JSON.stringify(gatherState()));
    for(const [field,suffix] of Object.entries(keys)){
      const key = 'wit_'+suffix;
      previous.set(key,localStorage.getItem(key));
      localStorage.setItem(key,JSON.stringify(state[field]));
    }
    for(const [key,value] of [['wit_name',state.name],['wit_classes_date','']]){
      previous.set(key,localStorage.getItem(key)); localStorage.setItem(key,value);
    }
  } catch(error){
    for(const [key,value] of previous){
      try { if(value===null) localStorage.removeItem(key); else localStorage.setItem(key,value); } catch {}
    }
    throw new Error('Not enough device storage to restore safely. Export a backup and free space first.');
  }
  ({links,schedule,classes,deadlines,events,coop,todos,transactions,budgetViewMode,budgetLimits,recurringBills,simBudget,grades,recurringIncome,incomeLog,countdown,habits,semester,focusSessions,gpaHistory} = state);
  nameEl.textContent = state.name || 'Your dashboard';
  refreshClassesForToday();
  renderLinks(); renderClasses(); renderDeadlines(); renderCoop(); renderTodos(); renderBudget();
  renderGrades(); renderCountdown(); renderHabits(); renderSemesterBar(); renderInsights(); renderDailyPlanner();
  if(document.getElementById('scheduleOverlay').classList.contains('open')) renderScheduleView();
}

function setSyncStatusPill(text){
  const pill = document.getElementById('syncStatusPill');
  if(pill) pill.textContent = text;
}
function scheduleCloudPush(){
  if(!syncEnabled || !syncCryptoKey || !syncGistId || !syncToken) return;
  clearTimeout(cloudSyncTimer);
  setSyncStatusPill('🔒 Syncing…');
  cloudSyncTimer = setTimeout(pushStateToCloud, 1500);
}
async function pushStateToCloud(){
  try{
    const bundle = gatherState();
    const encrypted = await encryptForSync(bundle, syncCryptoKey, syncSaltB64);
    await githubPatchGist(syncToken, syncGistId, JSON.stringify(encrypted));
    const now = new Date();
    localStorage.setItem('wit_last_synced', now.toISOString());
    setSyncStatusPill('🔒 Synced ' + fmtClock(now));
  } catch(err){
    console.error(err);
    const pill = document.getElementById('syncStatusPill');
    if(pill) pill.title = err.message || String(err);
    setSyncStatusPill('🔒 Sync failed — click to retry');
    toast('Sync failed: ' + (err.message || err) + (/404/.test(err.message||'') ? ' — if your GitHub token is a "fine-grained" token, switch to a classic token with the "gist" scope; fine-grained tokens can\'t access the Gists API.' : ''), true);
  }
}

// When a token is already remembered on this device, hide the token field
// entirely so unlocking on that device really is just "type a passphrase."
function showTokenField(){
  document.getElementById('lockTokenField').style.display = 'block';
  document.getElementById('lockRememberRow').style.display = 'flex';
  document.getElementById('lockUseDifferentRow').style.display = 'none';
  document.getElementById('lockHelp').style.display = 'block';
  document.getElementById('lockToken').value = '';
}
function hideTokenField(rememberedToken){
  document.getElementById('lockTokenField').style.display = 'none';
  document.getElementById('lockRememberRow').style.display = 'none';
  document.getElementById('lockUseDifferentRow').style.display = 'flex';
  document.getElementById('lockHelp').style.display = 'none';
  document.getElementById('lockToken').value = rememberedToken;
}
function openSyncOverlay(){
  document.getElementById('lockStatus').textContent = '';
  document.getElementById('lockPassphrase').value = '';
  const remembered = localStorage.getItem('wit_sync_token');
  if(remembered){
    document.getElementById('lockTitle').textContent = '🔒 Enter your passphrase';
    document.getElementById('lockDesc').textContent = 'This device already has a saved GitHub token — just enter your passphrase to sync.';
    hideTokenField(remembered);
  } else {
    document.getElementById('lockTitle').textContent = '🔒 Sync this dashboard across devices';
    document.getElementById('lockDesc').textContent = 'Optional. Enter a passphrase and a GitHub personal access token (scoped only to "gist") to sync all your data — classes, budget, to-dos, everything — to a private encrypted GitHub Gist. Same passphrase + token on another device loads the same data.';
    showTokenField();
  }
  showOverlay('lockOverlay');
  document.getElementById('lockPassphrase').focus();
}
function closeSyncOverlay(){
  hideOverlay('lockOverlay');
}
function useOfflineOnly(){
  syncEnabled = false;
  localStorage.setItem('wit_sync_enabled', '0');
  setSyncStatusPill('🔓 Offline (this device only)');
  closeSyncOverlay();
}

async function handleUnlockSubmit(){
  const passphrase = document.getElementById('lockPassphrase').value;
  const tokenInput = document.getElementById('lockToken').value.trim();
  const remember = document.getElementById('lockRemember').checked;
  const statusEl = document.getElementById('lockStatus');
  const token = tokenInput || localStorage.getItem('wit_sync_token') || '';

  if(!passphrase || !token){
    statusEl.textContent = 'Enter both a passphrase and a GitHub token.';
    return;
  }
  if(!window.isSecureContext || !crypto.subtle){
    statusEl.textContent = 'Sync needs a secure (https) page — it won\'t work opened as a local file. Host it (e.g. GitHub Pages) first.';
    return;
  }

  statusEl.textContent = 'Connecting…';
  try{
    let gistId = localStorage.getItem('wit_sync_gist_id');
    if(gistId){
      // Verify it's still valid/reachable; fall back to searching if not.
      try{ await githubGetGistContent(token, gistId); }
      catch(e){ gistId = null; }
    }
    if(!gistId) gistId = await githubFindGist(token);

    let payload = null;
    if(gistId){
      const content = await githubGetGistContent(token, gistId);
      payload = content ? JSON.parse(content) : null;
    }

    const salt = (payload && payload.salt) ? fromB64(payload.salt) : randomBytes(16);
    const key = await deriveSyncKey(passphrase, salt);

    let bundle = null;
    if(payload){
      try{
        bundle = validateBundle(await decryptForSync(payload, key));
      } catch(e){
        statusEl.textContent = 'Wrong passphrase (or the stored data is corrupted). Try again.';
        return;
      }
    }

    if(bundle && JSON.stringify(bundle) !== JSON.stringify(gatherState()) && !confirm('Load the encrypted cloud copy on this device? Your current dashboard will be kept as a recovery backup.')){statusEl.textContent='Sync canceled; local data kept.';return;}
    syncToken = token;
    syncCryptoKey = key;
    syncSaltB64 = toB64(salt);
    syncEnabled = true;

    if(!gistId){
      // Brand-new setup: seed the cloud with whatever's on this device already.
      const seed = gatherState();
      const encrypted = await encryptForSync(seed, key, syncSaltB64);
      gistId = await githubCreateGist(token, JSON.stringify(encrypted));
      bundle = seed;
    }
    syncGistId = gistId;
    localStorage.setItem('wit_sync_gist_id', gistId);
    if(remember) localStorage.setItem('wit_sync_token', token);
    else localStorage.removeItem('wit_sync_token');
    localStorage.setItem('wit_sync_enabled', '1');

    if(bundle) applyCloudState(bundle);

    const unlockedAt = new Date();
    localStorage.setItem('wit_last_synced', unlockedAt.toISOString());
    setSyncStatusPill('🔒 Synced ' + fmtClock(unlockedAt));
    closeSyncOverlay();
  } catch(err){
    syncEnabled = false;
    clearTimeout(cloudSyncTimer);
    console.error(err);
    const msg = err.message || '';
    let hintText = '';
    if(/404/.test(msg)) hintText = ' If your GitHub token is a "fine-grained" token, GitHub does not let those access the Gists API yet — create a classic token instead, scoped only to "gist".';
    else if(/401/.test(msg)) hintText = ' Your saved token was rejected (expired, revoked, or never valid). Click "Use a different token" below and paste a fresh classic token scoped to "gist".';
    statusEl.textContent = 'Connection error: ' + err.message + hintText;
  }
}

function initSyncGate(){
  const enabledFlag = localStorage.getItem('wit_sync_enabled');
  const lastSynced = localStorage.getItem('wit_last_synced');
  const lastSyncedLabel = lastSynced ? ` (last synced ${fmtClock(new Date(lastSynced))})` : '';
  if(enabledFlag === '0'){
    // User explicitly chose offline-only on this device — don't nag every visit.
    setSyncStatusPill('🔓 Offline (this device only)');
    return;
  }
  if(enabledFlag === '1'){
    setSyncStatusPill('🔒 Enter passphrase to sync' + lastSyncedLabel);
  } else {
    setSyncStatusPill('🔒 Set up sync');
  }
  // Show the overlay on every load until the user has made an explicit
  // choice (sync configured, or offline-only) — otherwise it's too easy to
  // miss and end up with unsynced, diverging data per browser.
  // Local data is immediately usable; sync remains an explicit toolbar action.
}
initSyncGate();

/* ============ Toast notifications ============ */
function toast(message, isError, undoFn){
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  el.appendChild(textSpan);
  const dismiss = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  if(undoFn){
    const btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = 'Undo';
    btn.onclick = () => { undoFn(); dismiss(); };
    el.appendChild(btn);
  }
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(dismiss, undoFn ? 6000 : 3500);
}

/* ============ Backup export / import ============ */
// A manual JSON backup as a safety net independent of cloud sync — useful
// if sync isn't set up yet, or as an extra copy before big changes.
function exportBackup(){
  const backup = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    name: localStorage.getItem('wit_name') || '',
    links, schedule, classes, deadlines, events, coop, todos,
    transactions, budgetViewMode, budgetLimits, recurringBills, simBudget,
    grades, recurringIncome, incomeLog, countdown,
    habits, semester, focusSessions, gpaHistory
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wit-dashboard-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Backup downloaded ✓');
}
function handleBackupImport(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const backup = JSON.parse(e.target.result);
      validateBundle(backup);
      if(!confirm('Replace matching dashboard sections with this backup? A recovery copy of your current data will be kept on this device.')) return;
      applyCloudState(backup); // same shape as a cloud sync bundle, so this reuses that logic
      scheduleCloudPush();
      toast('Backup restored. Previous data is available under Export recovery copy.');
    } catch(err){
      toast('Could not read that backup file: ' + err.message, true);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* ============ Budget modal open/close ============ */
function openBudgetModal(){
  showOverlay('budgetOverlay');
  // Tab indicators are 0-width until their container is visible, so
  // recompute their position now that the modal is actually on screen.
  updateTabIndicator(document.querySelector('.pie-toggle'));
  updateTabIndicator(document.querySelector('.sim-mode-toggle'));
}
function closeBudgetModal(){
  hideOverlay('budgetOverlay');
}

/* ============ Grades / GPA tracker ============ */
let grades = load('wit_grades', []);
// Standard 4.0-scale conversion table, checked from highest cutoff down.
const GPA_SCALE = [
  {min:93,letter:'A',points:4.0}, {min:90,letter:'A-',points:3.7},
  {min:87,letter:'B+',points:3.3}, {min:83,letter:'B',points:3.0}, {min:80,letter:'B-',points:2.7},
  {min:77,letter:'C+',points:2.3}, {min:73,letter:'C',points:2.0}, {min:70,letter:'C-',points:1.7},
  {min:67,letter:'D+',points:1.3}, {min:63,letter:'D',points:1.0}, {min:60,letter:'D-',points:0.7},
  {min:-Infinity,letter:'F',points:0.0}
];
function gradeInfoForPercent(pct){
  if(pct === '' || pct === null || isNaN(pct)) return {letter:'—', points:null};
  const n = Number(pct);
  return GPA_SCALE.find(row => n >= row.min);
}
function computeGPA(){
  const valid = grades.filter(g => g.percent !== '' && g.percent !== null && !isNaN(g.percent) && Number(g.credits) > 0);
  if(valid.length === 0) return null;
  const totalCredits = valid.reduce((s,g) => s + Number(g.credits), 0);
  const totalPoints = valid.reduce((s,g) => s + gradeInfoForPercent(g.percent).points * Number(g.credits), 0);
  return totalCredits ? totalPoints / totalCredits : null;
}
function renderGrades(){
  const el = document.getElementById('gradesBody');
  if(!el) return;
  el.innerHTML = grades.length ? grades.map((g,i)=>{
    const info = gradeInfoForPercent(g.percent);
    return `<tr data-idx="${i}">
      <td contenteditable="true" onblur="editCourse(${i},'name',this.textContent)">${esc(g.name)}</td>
      <td contenteditable="true" onblur="editCourse(${i},'credits',this.textContent)">${esc(String(g.credits))}</td>
      <td contenteditable="true" onblur="editCourse(${i},'percent',this.textContent)">${g.percent === '' || g.percent === null ? '' : esc(String(g.percent))}</td>
      <td>${info.letter}</td>
      <td style="white-space:nowrap;">
        <button class="del-btn" onclick="calcWhatIf(${i})" title="What-if calculator">🧮</button>
        <button class="del-btn" onclick="deleteCourse(${i})">✕</button>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" class="empty-note">Add a course to track grades and estimate GPA.</td></tr>';

  const gpa = computeGPA();
  const pill = document.getElementById('gpaPill');
  if(pill) pill.textContent = gpa === null ? 'GPA —' : `GPA ${gpa.toFixed(2)}`;
  snapshotGPA();
}
// "What do I need on the final to hit my target grade?" — takes the course's
// current percent as the grade for the portion of the course already graded.
function calcWhatIf(i){
  const course = grades[i];
  const current = Number(course.percent);
  if(course.percent === '' || course.percent === null || isNaN(current)){
    toast('Enter a current grade % for this course first.', true);
    return;
  }
  const remainingStr = prompt(`${course.name}: what % of your grade is left (e.g. final exam = 20)?`, '20');
  if(remainingStr === null) return;
  const remaining = parseFloat(remainingStr);
  if(isNaN(remaining) || remaining <= 0 || remaining > 100){ toast('Enter a remaining weight between 1 and 100.', true); return; }
  const targetStr = prompt(`Target overall grade % for ${course.name}?`, '90');
  if(targetStr === null) return;
  const target = parseFloat(targetStr);
  if(isNaN(target)){ toast('Enter a valid target grade %.', true); return; }
  const remainingFrac = remaining / 100;
  const needed = (target - current * (1 - remainingFrac)) / remainingFrac;
  if(needed > 100) toast(`Even a perfect 100% on the remaining ${remaining}% won't reach ${target}% — you'd need ${needed.toFixed(1)}%.`, true);
  else if(needed < 0) toast(`You've already secured better than ${target}% — even a 0% on the rest keeps you above it.`);
  else toast(`You need ${needed.toFixed(1)}% on the remaining ${remaining}% of ${course.name} to hit ${target}% overall.`);
}
function addCourse(){
  grades.push({name:'New Course', credits:3, percent:''});
  save('wit_grades', grades);
  renderGrades();
  highlightEl(document.querySelectorAll('#gradesBody tr')[grades.length-1]);
}
function editCourse(i, field, val){
  if(field === 'credits' || field === 'percent'){
    const n = parseFloat(String(val).replace(/[^0-9.]/g,''));
    grades[i][field] = isNaN(n) ? (field === 'credits' ? grades[i][field] : '') : n;
  } else {
    grades[i][field] = val.trim();
  }
  save('wit_grades', grades);
  renderGrades();
}
function deleteCourse(i){
  const removed = grades[i];
  grades.splice(i,1);
  save('wit_grades', grades);
  renderGrades();
  toast(`Removed "${removed.name}"`, false, ()=>{
    grades.splice(i,0,removed); save('wit_grades', grades); renderGrades();
  });
}
function openGradesModal(){
  showOverlay('gradesOverlay');
  renderGrades();
}
function closeGradesModal(){
  hideOverlay('gradesOverlay');
}

/* ============ Focus / Pomodoro timer ============ */
let timerSettings = load('wit_timer_settings', { focusMin:25, breakMin:5 });
let timerState = { mode:'focus', remaining: timerSettings.focusMin*60, running:false, intervalId:null };
function formatTimer(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function renderTimer(){
  const totalForMode = (timerState.mode === 'focus' ? timerSettings.focusMin : timerSettings.breakMin) * 60;
  const displayEl = document.getElementById('timerDisplay');
  const modeEl = document.getElementById('timerModeLabel');
  const ring = document.getElementById('timerRing');
  const startBtn = document.getElementById('timerStartBtn');
  if(!displayEl) return;
  displayEl.textContent = formatTimer(timerState.remaining);
  modeEl.textContent = timerState.mode === 'focus' ? 'Focus' : 'Break';
  const circumference = 2 * Math.PI * 78;
  const pct = totalForMode ? timerState.remaining / totalForMode : 0;
  ring.setAttribute('stroke-dasharray', circumference.toFixed(1));
  ring.setAttribute('stroke-dashoffset', (circumference * (1 - pct)).toFixed(1));
  if(startBtn) startBtn.textContent = timerState.running ? 'Pause' : 'Start';
}
function tickTimer(){
  if(!timerState.running) return;
  timerState.remaining = Math.max(0, Math.ceil((timerState.endsAt - Date.now()) / 1000));
  if(timerState.remaining <= 0){
    const finishedMode = timerState.mode;
    timerState.mode = finishedMode === 'focus' ? 'break' : 'focus';
    timerState.remaining = (timerState.mode === 'focus' ? timerSettings.focusMin : timerSettings.breakMin) * 60;
    timerState.endsAt = Date.now() + timerState.remaining * 1000;
    if(finishedMode === 'focus') logFocusSession(timerSettings.focusMin);
    toast(finishedMode === 'focus' ? '⏱ Focus session done — take a break!' : '⏱ Break\'s over — back to it.');
  }
  renderTimer();
}
function toggleTimer(){
  if(timerState.running){
    tickTimer();
    clearInterval(timerState.intervalId);
    timerState.running = false;
  } else {
    timerState.running = true;
    timerState.endsAt = Date.now() + timerState.remaining * 1000;
    timerState.intervalId = setInterval(tickTimer, 1000);
  }
  renderTimer();
}
function resetTimer(){
  clearInterval(timerState.intervalId);
  timerState.mode = 'focus';
  timerState.running = false;
  timerState.remaining = timerSettings.focusMin * 60;
  renderTimer();
}
function saveTimerSettings(){
  const focusMin = Math.min(180, Math.max(1, parseInt(document.getElementById('timerFocusMin').value, 10) || 25));
  const breakMin = Math.min(60, Math.max(1, parseInt(document.getElementById('timerBreakMin').value, 10) || 5));
  timerSettings = { focusMin, breakMin };
  save('wit_timer_settings', timerSettings);
  resetTimer();
  toggleForm('timerSettingsForm');
  toast('Timer settings saved ✓');
}
function openTimerModal(){
  document.getElementById('timerFocusMin').value = timerSettings.focusMin;
  document.getElementById('timerBreakMin').value = timerSettings.breakMin;
  showOverlay('timerOverlay');
  renderTimer();
}
function closeTimerModal(){
  hideOverlay('timerOverlay');
  if(focusModeActive) setFocusMode(false);
}

/* ============ Habit / streak tracker ============ */
let habits = load('wit_habits', []);
function computeStreak(habit){
  let streak = 0;
  const d = new Date();
  if(!habit.log[localISODate(d)]) d.setDate(d.getDate()-1);
  while(habit.log[localISODate(d)]){
    streak++;
    d.setDate(d.getDate()-1);
  }
  return streak;
}
function renderHabits(){
  const el = document.getElementById('habitsBody');
  if(!el) return;
  if(habits.length === 0){
    el.innerHTML = '<div class="empty-note">No habits yet — add one below.</div>';
    return;
  }
  const days = [];
  const today = new Date();
  for(let i=69;i>=0;i--){ const d = new Date(today); d.setDate(today.getDate()-i); days.push(d); }
  el.innerHTML = habits.map((h,hi)=>{
    const streak = computeStreak(h);
    const cells = days.map(d=>{
      const key = localISODate(d);
      const done = !!h.log[key];
      return `<button class="habit-cell ${done?'done':''}" onclick="toggleHabitDay(${hi},'${key}')" title="${key}" aria-label="${esc(h.name)} on ${key}" aria-pressed="${done}"></button>`;
    }).join('');
    return `<div class="habit-row" data-idx="${hi}">
      <div class="habit-row-head">
        <span contenteditable="true" onblur="editHabitName(${hi},this.textContent)">${esc(h.name)}</span>
        <span class="habit-streak">🔥 ${streak}</span>
        <button class="del-btn" onclick="deleteHabit(${hi})">✕</button>
      </div>
      <div class="habit-grid">${cells}</div>
    </div>`;
  }).join('');

}
function toggleHabitDay(hi, key){
  const habit = habits[hi];
  if(habit.log[key]) delete habit.log[key];
  else habit.log[key] = true;
  save('wit_habits', habits);
  renderHabits();
}
function editHabitName(hi, val){
  habits[hi].name = val.trim() || habits[hi].name;
  save('wit_habits', habits);
  renderHabits();
}
function addHabit(){
  const name = document.getElementById('habitName').value.trim();
  if(!name) return;
  habits.push({name, log:{}});
  save('wit_habits', habits);
  document.getElementById('habitName').value = '';
  renderHabits();
  highlightEl(document.querySelectorAll('#habitsBody .habit-row')[habits.length-1]);
}
function deleteHabit(hi){
  const removed = habits[hi];
  habits.splice(hi,1);
  save('wit_habits', habits);
  renderHabits();
  toast(`Removed habit "${removed.name}"`, false, ()=>{
    habits.splice(hi,0,removed); save('wit_habits', habits); renderHabits();
  });
}
/* ============ Insights / Analytics ============ */
let focusSessions = load('wit_focus_sessions', []);
let gpaHistory = load('wit_gpa_history', []);
function logFocusSession(minutes){
  focusSessions.push({date: todayISO(), minutes});
  save('wit_focus_sessions', focusSessions);
}
function snapshotGPA(){
  const gpa = computeGPA();
  if(gpa === null) return;
  const today = todayISO();
  const existing = gpaHistory.find(h => h.date === today);
  if(existing) existing.gpa = gpa;
  else gpaHistory.push({date: today, gpa});
  save('wit_gpa_history', gpaHistory);
}
function computeInsights(){
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
  const focusMinutesWeek = focusSessions.filter(s => new Date(s.date) >= weekAgo).reduce((s,x)=>s+x.minutes,0);

  const totalTodos = todos.length;
  const doneTodos = todos.filter(t=>t.done).length;
  const todoRate = totalTodos ? Math.round(doneTodos/totalTodos*100) : 0;

  let habitPct = null;
  if(habits.length){
    const days30 = [];
    for(let i=0;i<30;i++){ const d=new Date(now); d.setDate(now.getDate()-i); days30.push(localISODate(d)); }
    let doneCount = 0, totalCount = 0;
    habits.forEach(h=>{ days30.forEach(key=>{ totalCount++; if(h.log[key]) doneCount++; }); });
    habitPct = totalCount ? Math.round(doneCount/totalCount*100) : 0;
  }

  const gpa = computeGPA();

  const mk = currentMonthKey();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMk = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;
  const thisExpense = transactions.filter(t=>t.type==='expense'&&txnMonthKey(t.date)===mk).reduce((s,t)=>s+Number(t.amount),0);
  const lastExpense = transactions.filter(t=>t.type==='expense'&&txnMonthKey(t.date)===lastMk).reduce((s,t)=>s+Number(t.amount),0);
  const spendChangePct = lastExpense ? Math.round(((thisExpense-lastExpense)/lastExpense)*100) : null;

  return { focusMinutesWeek, totalTodos, doneTodos, todoRate, habitPct, gpa, thisExpense, spendChangePct };
}
function renderInsights(){
  const el = document.getElementById('insightsBody');
  if(!el) return;
  const s = computeInsights();
  const hrs = Math.floor(s.focusMinutesWeek/60), mins = s.focusMinutesWeek%60;
  el.innerHTML = `
    <div class="budget-summary">
      <div class="budget-pill"><div class="label">Focus this week</div><div class="value">${hrs}h ${mins}m</div></div>
      <div class="budget-pill"><div class="label">Tasks done</div><div class="value">${s.doneTodos}/${s.totalTodos} (${s.todoRate}%)</div></div>
      <div class="budget-pill"><div class="label">Habit consistency</div><div class="value">${s.habitPct===null?'—':s.habitPct+'%'}</div></div>
    </div>
    <div class="budget-summary" style="margin-top:10px;">
      <div class="budget-pill balance"><div class="label">Current GPA</div><div class="value">${s.gpa===null?'—':s.gpa.toFixed(2)}</div></div>
      <div class="budget-pill expense"><div class="label">Spent this month</div><div class="value">$${s.thisExpense.toFixed(2)}</div></div>
      <div class="budget-pill"><div class="label">Vs last month</div><div class="value">${s.spendChangePct===null?'—':(s.spendChangePct>0?'+':'')+s.spendChangePct+'%'}</div></div>
    </div>
    <div style="margin-top:16px;">
      <h3 class="sub-head">GPA Trend</h3>
      <div id="gpaTrendChart"></div>
    </div>`;
  renderGpaTrend();
}
function renderGpaTrend(){
  const el = document.getElementById('gpaTrendChart');
  if(!el) return;
  if(gpaHistory.length < 2){
    el.innerHTML = '<div class="empty-note">Not enough history yet — check back after a few grade updates.</div>';
    return;
  }
  const w = 440, h = 80, pad = 10;
  const vals = gpaHistory.map(p=>p.gpa);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 4);
  const coord = (p,i) => {
    const x = pad + (i/(gpaHistory.length-1)) * (w-2*pad);
    const y = h - pad - ((p.gpa-min)/((max-min)||1)) * (h-2*pad);
    return {x,y};
  };
  const points = gpaHistory.map((p,i)=>{ const c = coord(p,i); return `${c.x.toFixed(1)},${c.y.toFixed(1)}`; }).join(' ');
  const dots = gpaHistory.map((p,i)=>{
    const c = coord(p,i);
    return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.5" fill="#ffc708"><title>${p.date}: ${p.gpa.toFixed(2)}</title></circle>`;
  }).join('');
  el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${points}" fill="none" stroke="#2cafc5" stroke-width="2"/>
    ${dots}
  </svg>`;
}
function openInsightsModal(){
  showOverlay('insightsOverlay');
  renderInsights();
}
function closeInsightsModal(){
  hideOverlay('insightsOverlay');
}

function openShortcutsModal(){
  const vEl = document.getElementById('dashboardVersion');
  if(vEl){ vEl.textContent = DASHBOARD_VERSION; vEl.title = DASHBOARD_UPDATED; }
  showOverlay('shortcutsOverlay');
}
function closeShortcutsModal(){
  hideOverlay('shortcutsOverlay');
}
function openHabitsModal(){
  showOverlay('habitsOverlay');
  renderHabits();
}
function closeHabitsModal(){
  hideOverlay('habitsOverlay');
}

/* ============ Focus mode ============ */
// Honest limits, spelled out: a web page cannot block navigation, disable
// tabs, or stop you from typing a URL — no browser allows a site that much
// control (for good reason). What's real here: a fullscreen takeover (hides
// tabs/address bar — Esc always escapes it, that's the browser's rule, not
// ours), a count of how many times you left while it was on, and a
// press-and-hold requirement to turn it off on purpose rather than one
// reflexive click. Friction, not a lock.
let focusModeActive = false;
let focusDistractionCount = 0;
let focusAwayFromMode = false;
function requestFocusFullscreen(){
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if(req) req.call(el).catch(()=>{});
}
function exitFullscreenIfActive(){
  if(!(document.fullscreenElement || document.webkitFullscreenElement)) return;
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if(exit) exit.call(document).catch(()=>{});
}
// Browser-forced fullscreen exits (Esc, F11, an OS gesture) happen whether
// we like it or not and can't be intercepted — this just keeps our own
// focus-mode state honest when that happens outside our own toggle.
document.addEventListener('fullscreenchange', ()=>{
  if(focusModeActive && !document.fullscreenElement && !document.webkitFullscreenElement){
    setFocusMode(false);
    closeTimerModal();
  }
});
function handleFocusAwayCheck(isAway){
  if(!focusModeActive) return;
  if(isAway){
    if(!focusAwayFromMode){
      focusAwayFromMode = true;
      focusDistractionCount++;
      const btn = document.getElementById('focusModeBtn');
      if(btn) btn.title = `Left focus ${focusDistractionCount} time${focusDistractionCount>1?'s':''} so far — hold to exit`;
    }
  } else {
    focusAwayFromMode = false;
  }
}
document.addEventListener('visibilitychange', ()=> handleFocusAwayCheck(document.hidden));
window.addEventListener('blur', ()=> handleFocusAwayCheck(true));
window.addEventListener('focus', ()=> handleFocusAwayCheck(false));

function setFocusMode(on){
  focusModeActive = on;
  document.body.classList.toggle('focus-mode', on);
  const btn = document.getElementById('focusModeBtn');
  if(on){
    focusDistractionCount = 0;
    focusAwayFromMode = false;
    if(btn){ btn.textContent = '🧘 Hold to Exit'; btn.title = 'Press and hold to exit (Esc also works)'; }
    requestFocusFullscreen();
  } else {
    exitFullscreenIfActive();
    if(btn){ btn.textContent = '🧘 Focus Mode'; btn.title = 'Shortcut: F'; }
    if(focusDistractionCount > 0){
      toast(`Focus session ended — you left the tab ${focusDistractionCount} time${focusDistractionCount>1?'s':''} while it was on.`);
    }
  }
}
function toggleFocusMode(){
  if(focusModeActive){
    setFocusMode(false);
    closeTimerModal();
  } else {
    setFocusMode(true);
    openTimerModal();
  }
}
// Press-and-hold to exit: a plain click/tap on the button does nothing —
// only holding it down for FOCUS_EXIT_HOLD_MS actually exits. Entering
// focus mode (button not yet active) stays a single click, since the
// friction is only meant to work against leaving impulsively.
const FOCUS_EXIT_HOLD_MS = 1100;
let focusHoldTimer = null;
function focusBtnPointerDown(e){
  if(!focusModeActive){ toggleFocusMode(); return; }
  const btn = document.getElementById('focusModeBtn');
  if(!btn || focusHoldTimer) return;
  const start = Date.now();
  btn.classList.add('holding');
  btn.style.setProperty('--hold-pct', 0);
  focusHoldTimer = setInterval(()=>{
    const pct = Math.min(1, (Date.now() - start) / FOCUS_EXIT_HOLD_MS);
    btn.style.setProperty('--hold-pct', pct);
    if(pct >= 1){
      clearInterval(focusHoldTimer); focusHoldTimer = null;
      btn.classList.remove('holding');
      toggleFocusMode();
    }
  }, 25);
}
function focusBtnPointerUp(){
  const btn = document.getElementById('focusModeBtn');
  if(focusHoldTimer){ clearInterval(focusHoldTimer); focusHoldTimer = null; }
  if(btn){ btn.classList.remove('holding'); btn.style.setProperty('--hold-pct', 0); }
}

/* ============ Command palette ============ */
const PALETTE_COMMANDS = [
  {label:'Open Schedule', action: openScheduleModal},
  {label:'Add Calendar Event (one-time or recurring)', action: ()=>{ openScheduleModal(); toggleAddEventForm(); }},
  {label:'Open Budget', action: openBudgetModal},
  {label:'Open Grades', action: openGradesModal},
  {label:'Open Focus Timer', action: openTimerModal},
  {label:'Open Habits', action: openHabitsModal},
  {label:'Open Insights', action: openInsightsModal},
  {label:'Toggle Focus Mode', action: toggleFocusMode},
  {label:'Focus Quick Capture bar', action: ()=> document.getElementById('quickCapture').focus()},
  {label:'Add a To-do', action: ()=> document.getElementById('newTodo').focus()},
  {label:'Export Backup (JSON)', action: exportBackup},
  {label:'Export Budget CSV', action: exportBudgetCSV},
  {label:'Export Calendar (.ics)', action: exportICS},
  {label:'Set Countdown', action: editCountdown},
  {label:'Set Semester Dates', action: editSemester},
  {label:'Set up Cloud Sync', action: openSyncOverlay},
  {label:'Keyboard Shortcuts & Quick Capture Help', action: openShortcutsModal},
];
let paletteFiltered = PALETTE_COMMANDS;
let paletteActiveIdx = 0;
function openPalette(){
  showOverlay('paletteOverlay');
  const input = document.getElementById('paletteInput');
  input.value = '';
  filterPalette();
  setTimeout(()=> input.focus(), 10);
}
function closePalette(){
  hideOverlay('paletteOverlay');
}
function filterPalette(){
  const q = document.getElementById('paletteInput').value.toLowerCase();
  paletteFiltered = PALETTE_COMMANDS.filter(c => c.label.toLowerCase().includes(q));
  paletteActiveIdx = 0;
  renderPaletteList();
}
function renderPaletteList(){
  const el = document.getElementById('paletteList');
  if(paletteFiltered.length === 0){
    el.innerHTML = '<div class="empty-note" style="padding:14px 18px;">No matching commands.</div>';
    return;
  }
  el.innerHTML = paletteFiltered.map((c,i)=>
    `<div class="palette-item ${i===paletteActiveIdx?'active':''}" onmouseenter="paletteActiveIdx=${i};renderPaletteList();" onclick="runPaletteCommand(${i})">${esc(c.label)}</div>`
  ).join('');
}
function runPaletteCommand(i){
  const cmd = paletteFiltered[i];
  if(!cmd) return;
  closePalette();
  cmd.action();
}
function paletteKeydown(e){
  if(e.key === 'ArrowDown'){ e.preventDefault(); paletteActiveIdx = Math.min(paletteFiltered.length-1, paletteActiveIdx+1); renderPaletteList(); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); paletteActiveIdx = Math.max(0, paletteActiveIdx-1); renderPaletteList(); }
  else if(e.key === 'Enter'){ e.preventDefault(); runPaletteCommand(paletteActiveIdx); }
  else if(e.key === 'Escape'){ closePalette(); }
}

/* ============ Browser notifications: deadlines due soon + classes starting soon ============ */
function parseLeadingTime(str){
  if(!str) return null;
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if(!m) return null;
  let h = parseInt(m[1],10);
  const min = parseInt(m[2],10);
  const ap = (m[3] || '').toUpperCase();
  if(min > 59 || h > (ap ? 12 : 23) || (ap && h < 1)) return null;
  if(ap === 'PM' && h !== 12) h += 12;
  if(ap === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}
let notifiedToday = load('wit_notified_today', { date: todayISO(), deadlines: [], classes: [], events: [], bills: [] });
function resetNotifiedIfNewDay(){
  if(notifiedToday.date !== todayISO()){
    notifiedToday = { date: todayISO(), deadlines: [], classes: [], events: [], bills: [] };
    localStorage.setItem('wit_notified_today', JSON.stringify(notifiedToday));
  }
  // Older saved state may predate these fields — patch them in rather than
  // wiping the deadlines/classes history that's already recorded for today.
  if(!notifiedToday.events) notifiedToday.events = [];
  if(!notifiedToday.bills) notifiedToday.bills = [];
}
function sendNotification(title, body){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try{ new Notification(title, { body }); } catch(e){}
}
// True while "now" falls inside one of today's class time blocks, so
// deadline pings can stay quiet mid-lecture instead of buzzing your phone.
// Fails safe: any class whose time string can't be parsed is just skipped
// rather than blocking notifications entirely.
function isInClassRightNow(){
  const now = new Date();
  return classes.some(c=>{
    const parts = (c.time || '').split(/[–-]/).map(s=>s.trim());
    if(parts.length < 2) return false;
    const start = parseLeadingTime(parts[0]);
    const end = parseLeadingTime(parts[1]);
    if(!start || !end) return false;
    return now >= start && now <= end;
  });
}
function checkNotifications(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  resetNotifiedIfNewDay();
  const now = new Date();
  if(!isInClassRightNow()){
    deadlines.forEach(d=>{
      if(!d.date) return;
      const due = new Date(d.date+'T23:59:59');
      const hoursUntil = (due - now) / 3600000;
      const key = d.title + '|' + d.date;
      if(hoursUntil >= 0 && hoursUntil <= dueSoonWindowHours(d.priority || 'Medium') && !notifiedToday.deadlines.includes(key)){
        sendNotification('Deadline due soon', `${d.title} is due ${fmtDeadlineDate(d.date)}`);
        notifiedToday.deadlines.push(key);
        localStorage.setItem('wit_notified_today', JSON.stringify(notifiedToday));
      }
    });
  }
  classes.forEach(c=>{
    const start = parseLeadingTime(c.time);
    if(!start) return;
    const minsUntil = (start - now) / 60000;
    const key = c.name + '|' + c.time;
    if(minsUntil >= 0 && minsUntil <= 10 && !notifiedToday.classes.includes(key)){
      sendNotification('Class starting soon', `${c.name} starts at ${(c.time||'').split(/[–-]/)[0].trim()}${c.room ? ' — ' + c.room : ''}`);
      notifiedToday.classes.push(key);
      localStorage.setItem('wit_notified_today', JSON.stringify(notifiedToday));
    }
  });
  events.forEach(ev=>{
    if(!ev.time || !eventOccursOnDate(ev, now)) return;
    const start = parseLeadingTime(ev.time);
    if(!start) return;
    const minsUntil = (start - now) / 60000;
    const key = ev.id + '|' + todayISO();
    if(minsUntil >= 0 && minsUntil <= 10 && !notifiedToday.events.includes(key)){
      sendNotification('Event starting soon', `${ev.title} starts at ${ev.time}${ev.endTime ? ' – ' + ev.endTime : ''}`);
      notifiedToday.events.push(key);
      localStorage.setItem('wit_notified_today', JSON.stringify(notifiedToday));
    }
  });
  if(!isInClassRightNow()){
    recurringBills.forEach((b,i)=>{
      const day = parseInt(b.day, 10);
      if(!day) return;
      const dueInMonth = month => new Date(now.getFullYear(), month, Math.min(day, new Date(now.getFullYear(),month+1,0).getDate()),23,59,59);
      let due = dueInMonth(now.getMonth());
      if(due < now) due = dueInMonth(now.getMonth()+1);
      const hoursUntil = (due - now) / 3600000;
      const key = i + '|' + b.name + '|' + localISO(due);
      if(hoursUntil >= 0 && hoursUntil <= dueSoonWindowHours('Medium') && !notifiedToday.bills.includes(key)){
        sendNotification('Bill due soon', `${b.name} ($${Number(b.amount).toFixed(2)}) is due ${fmtDeadlineDate(localISO(due))}`);
        notifiedToday.bills.push(key);
        localStorage.setItem('wit_notified_today', JSON.stringify(notifiedToday));
      }
    });
  }
}
function requestNotificationPermission(){
  if(!('Notification' in window)){ toast('Notifications are not supported in this browser.', true); return; }
  Notification.requestPermission().then(perm=>{
    if(perm === 'granted'){ toast('Notifications enabled ✓'); checkNotifications(); }
    else toast('Notifications were not enabled.', true);
  });
}
setInterval(checkNotifications, 60000);
setTimeout(checkNotifications, 3000);

/* ============ Drag-to-reorder cards (within a column) ============ */
function saveCardOrder(){
  const order = {};
  document.querySelectorAll('#mainGrid > .col-span-1').forEach((col,ci)=>{
    order['col'+ci] = Array.from(col.querySelectorAll(':scope > .card[data-card-id]')).map(c => c.dataset.cardId);
  });
  localStorage.setItem('wit_card_order', JSON.stringify(order));
}
function applyCardOrder(){
  const raw = localStorage.getItem('wit_card_order');
  if(!raw) return;
  try{
    const order = JSON.parse(raw);
    document.querySelectorAll('#mainGrid > .col-span-1').forEach((col,ci)=>{
      const ids = order['col'+ci];
      if(!ids) return;
      ids.forEach(id=>{
        const card = col.querySelector(`.card[data-card-id="${id}"]`);
        if(card) col.appendChild(card);
      });
    });
  } catch(e){ /* ignore malformed saved order */ }
}
function initCardDragReorder(){
  document.querySelectorAll('#mainGrid > .col-span-1').forEach(col=>{
    col.querySelectorAll(':scope > .card[data-card-id]').forEach(card=>{
      card.addEventListener('dragstart', (e)=>{
        if(e.target !== card){ e.stopPropagation(); return; }
        e.dataTransfer.setData('text/plain', card.dataset.cardId);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', ()=> card.classList.remove('dragging'));
      card.addEventListener('dragover', (e)=>{
        e.preventDefault();
        const dragging = col.querySelector('.card.dragging');
        if(!dragging || dragging === card) return;
        const rect = card.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        col.insertBefore(dragging, before ? card : card.nextSibling);
      });
      card.addEventListener('drop', (e)=>{ e.preventDefault(); saveCardOrder(); });
    });
  });
}
applyCardOrder();
document.querySelectorAll('#mainGrid > .col-span-1 > .card[data-card-id]').forEach(c => c.setAttribute('draggable','true'));
initCardDragReorder();

/* ============ PWA: register service worker for offline/installable support ============ */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{ /* offline support just won't be available */ });
  });
}

let visibleDay = todayISO();
function refreshVisibleDay(){
  if(document.hidden) return;
  if(timerState.running) tickTimer();
  if(visibleDay === todayISO()) return;
  visibleDay = todayISO();
  refreshClassesForToday(); refreshWeeklyIncome();
  renderClasses(); renderDeadlines(); renderDailyPlanner(); renderBudget(); renderHabits(); renderCountdown();
}
setInterval(refreshVisibleDay, 30000);
document.addEventListener('visibilitychange', refreshVisibleDay);

function exportRecoveryCopy(){
  const previous = localStorage.getItem('wit_before_restore');
  const raw = {};
  for(let i=0;i<localStorage.length;i++){
    const key = localStorage.key(i);
    if(key.startsWith('wit_') && !/token|sync|before_restore/.test(key)) raw[key] = localStorage.getItem(key);
  }
  const data = previous || JSON.stringify({recoveryStorage:raw},null,2);
  const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const link = document.createElement('a'); link.href=url; link.download='wit-recovery-'+todayISO()+'.json';
  link.click(); URL.revokeObjectURL(url);
  toast(previous ? 'Previous dashboard backup downloaded.' : 'Raw recovery copy downloaded. Keep it for manual recovery.');
}

/* Accessible existing primitives without a component-library migration. */
function enhanceControls(root){
  root.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(el=>{
    if(el.getAttribute('aria-label') || el.labels?.length) return;
    const label = ({newTodoCat:'Task category',deadlineDate:'Deadline date',deadlinePriority:'Deadline priority',txnDate:'Transaction date',txnType:'Transaction type',simIncome:'Monthly income',evDate:'Event date',evRepeat:'Repeat event',evInterval:'Repeat interval',evEndType:'Repeat ending',evEndUntil:'Repeat until',evEndCount:'Number of occurrences',timerFocusMin:'Focus minutes',timerBreakMin:'Break minutes'})[el.id] || el.getAttribute('placeholder') || el.id.replace(/([a-z])([A-Z])/g,'$1 $2') || 'Value';
    el.setAttribute('aria-label',label);
  });
  root.querySelectorAll('.close-modal').forEach(el=>el.setAttribute('aria-label','Close dialog'));
  root.querySelectorAll('.icon-btn,.del-btn').forEach(el=>{
    if(el.getAttribute('aria-label')) return;
    const context = el.closest('.qlink,.todo-item,.class-card,.kanban-card,tr,.habit-row,.card');
    const title = context?.querySelector('.label,.name,h2,[contenteditable]')?.textContent.trim() || 'item';
    el.setAttribute('aria-label',el.title || (el.textContent.trim()==='+' ? 'Add to ' : 'Remove ') + title);
  });
  root.querySelectorAll('.qlink a').forEach(el=>el.setAttribute('aria-label',el.closest('.qlink').querySelector('.label').textContent));
  root.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select)').forEach(el=>{
    if(el.classList.contains('modal-overlay') || el.isContentEditable) return;
    el.setAttribute('role','button'); el.setAttribute('tabindex','0');
  });
}
enhanceControls(document);
new MutationObserver(records=>{
  const parents = new Set(records.filter(r=>r.addedNodes.length).map(r=>r.target));
  parents.forEach(root=>{if(root.querySelectorAll) enhanceControls(root);});
}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ') && e.target.matches('[role="button"]:not(button)')){e.preventDefault();e.target.click();}
});
let overlayReturnFocus = null;
const overlays = Array.from(document.querySelectorAll('.modal-overlay'));
for(const overlay of overlays){
  const panel=overlay.querySelector('.modal');
  if(!panel) continue;
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.tabIndex=-1;
  const heading=panel.querySelector('h2');
  if(heading){heading.id ||= overlay.id+'Title';panel.setAttribute('aria-labelledby',heading.id);}
  else panel.setAttribute('aria-label',overlay.id==='paletteOverlay' ? 'Commands' : 'Schedule');
}
function updateOverlayInert(active){
  for(const child of document.body.children){
    if(['SCRIPT','STYLE'].includes(child.tagName) || child.id==='toastStack') continue;
    child.inert = !!active && child!==active && !(focusModeActive && child.classList.contains('meta-row'));
  }
}
function showOverlay(id){
  const target=document.getElementById(id);
  if(!overlays.some(overlay=>overlay.classList.contains('open'))) overlayReturnFocus=document.activeElement;
  if(focusModeActive && id!=='timerOverlay') setFocusMode(false);
  overlays.forEach(overlay=>overlay.classList.toggle('open',overlay===target));
  updateOverlayInert(target);
  (Array.from(target.querySelectorAll('input,select,textarea,button')).find(el=>!el.closest('[inert]') && !el.disabled) || target.querySelector('.modal')).focus();
}
function hideOverlay(id){
  document.getElementById(id).classList.remove('open');
  const active=overlays.find(overlay=>overlay.classList.contains('open'));
  updateOverlayInert(active);
  if(!active && overlayReturnFocus?.isConnected){overlayReturnFocus.focus();overlayReturnFocus=null;}
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab') return;
  const active = overlays.filter(o=>o.classList.contains('open')).at(-1);
  if(!active) return;
  const focusable = Array.from(active.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"],[contenteditable="true"]')).filter(el=>!el.disabled&&!el.closest('[inert]')&&el.getClientRects().length);
  if(!focusable.length){e.preventDefault();active.querySelector('.modal').focus();return;}
  const first=focusable[0],last=focusable.at(-1);
  if(e.shiftKey && (document.activeElement===first || !active.contains(document.activeElement))){e.preventDefault();last.focus();}
  else if(!e.shiftKey && (document.activeElement===last || !active.contains(document.activeElement))){e.preventDefault();first.focus();}
});
document.querySelectorAll('.inline-form').forEach(form=>form.inert=!form.classList.contains('open'));
// Keyboard reordering retains the existing column-based saved layout.
document.querySelectorAll('.drag-handle').forEach(handle=>{
  handle.tabIndex=0;handle.setAttribute('role','button');
  handle.setAttribute('aria-label','Reorder card: Alt + Arrow Up or Down');
  handle.addEventListener('keydown',e=>{
    if(!e.altKey || !['ArrowUp','ArrowDown'].includes(e.key)) return;
    const card=handle.closest('.card');
    const sibling=e.key==='ArrowUp'?card.previousElementSibling:card.nextElementSibling;
    if(!sibling) return;
    e.preventDefault();card.parentElement.insertBefore(card,e.key==='ArrowUp'?sibling:sibling.nextSibling);saveCardOrder();handle.focus();
  });
});
