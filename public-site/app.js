/* Orbit planner · local-first, framework-free, GitHub Pages compatible.
   Data format: {version:1, goals:[{id,title,description,horizon,status,due,parentId,rule,autoFrom,createdAt,updatedAt}]}
   Change HORIZONS / STATUSES to customize navigation and board columns.
*/
(() => {
  'use strict';
  const STORAGE_KEY = 'orbit-planner:v1';
  const HORIZONS = [
    {id:'year',label:'1 year',heading:'1-year horizon',hint:'Your north star: the outcomes you are working toward.'},
    {id:'nine',label:'9 months',heading:'9-month horizon',hint:'Validate the direction and define meaningful milestones.'},
    {id:'six',label:'6 months',heading:'6-month horizon',hint:'Turn your concept into a useful working product.'},
    {id:'quarter',label:'3 months',heading:'3-month horizon',hint:'Run focused experiments and build real capability.'},
    {id:'month',label:'1 month',heading:'Monthly focus',hint:'Choose tangible outcomes you can demonstrate.'},
    {id:'twenty',label:'20 days',heading:'20-day sprint',hint:'Set a small number of verifiable deliverables.'},
    {id:'ten',label:'10 days',heading:'10-day sprint',hint:'Test assumptions and unblock the next stage.'},
    {id:'three',label:'3 days',heading:'3-day focus',hint:'Break a deliverable into clear, manageable actions.'},
    {id:'day',label:'Daily focus',heading:'Today’s focus',hint:'Pick what you can actually finish today.'}
  ];
  const STATUSES = [
    {id:'idea',label:'Ideas',icon:'✧',color:'#936cdb',bg:'#efe7fc'},
    {id:'todo',label:'To do',icon:'☷',color:'#5094df',bg:'#e5f0ff'},
    {id:'progress',label:'In progress',icon:'◷',color:'#db9c36',bg:'#fff2d8'},
    {id:'blocked',label:'Blocked',icon:'⊘',color:'#e28d53',bg:'#fff0e4'},
    {id:'done',label:'Done',icon:'✓',color:'#31a887',bg:'#e1f8ed'},
    {id:'failed',label:'Failed',icon:'×',color:'#db6e88',bg:'#ffe7ed'}
  ];
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const generateId = () => crypto?.randomUUID?.() ?? `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = () => new Date().toISOString();
  const defaultGoals = () => [];
  const freshState = () => ({version:1,goals:defaultGoals(),events:[],dayNotes:{},schedule:[],agendaWindow:{start:'08:00',end:'20:00'},calendarName:'My calendar',calendarHourHeight:72});
  const readEvents = value => Array.isArray(value)?value.filter(e=>e&&typeof e==='object'&&typeof e.type==='string'&&typeof e.at==='string'):[];
  const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(value+'T12:00:00').getTime())&&value===(()=>{const d=new Date(value+'T12:00:00');return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();
  function sanitizeRepeat(value){if(!value||!['day','week','month'].includes(value.unit)||!validDate(value.start)||!validDate(value.end)||value.end<value.start)return null;return {unit:value.unit,interval:Math.max(1,Math.min(365,Math.floor(Number(value.interval)||1))),start:value.start,end:value.end,moves:Object.fromEntries(Object.entries(value.moves&&typeof value.moves==='object'?value.moves:{}).filter(([from,to])=>validDate(from)&&validDate(to))),ticks:Array.isArray(value.ticks)?[...new Set(value.ticks.filter(validDate))]:[]};}
  const cleanNotes=value=>Array.isArray(value)?value.filter(n=>n&&typeof n.text==='string').map(n=>({id:String(n.id||generateId()),text:n.text.slice(0,2000)})):[];
  const cleanDayNotes=value=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([date])=>validDate(date)).map(([date,notes])=>[date,cleanNotes(notes)]));
  const cleanAgenda=value=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([date])=>validDate(date)).map(([date,entry])=>[date,{time:/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(entry?.time||'')?entry.time:'',notes:cleanNotes(entry?.notes)}]));
  const minutesOf=time=>{const [h,m]=String(time).split(':').map(Number);return h*60+m;};
  const timeOf=minutes=>`${String(Math.floor((minutes%1440)/60)).padStart(2,'0')}:${String((minutes%1440)%60).padStart(2,'0')}`;
  const cleanCalendarName=value=>typeof value==='string'&&value.trim()?value.trim().slice(0,48):'My calendar';
  const cleanWindow=value=>{const start=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value?.start||'')?value.start:'08:00';let end=/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(value?.end||'')?value.end:'20:00';if(end==='00:00')end='24:00';return minutesOf(end)>minutesOf(start)&&minutesOf(end)<=1440?{start,end}:{start:'08:00',end:'20:00'};};
  function cleanSchedule(value,goals=[]){
    if(!Array.isArray(value))return goals.flatMap(goal=>Object.entries(goal.agenda||{}).map(([date,entry])=>({id:'migrated-'+goal.id+'-'+date,date,title:goal.title,time:entry.time||'09:00',duration:45,taskId:goal.id,projectId:'',notes:cleanNotes(entry.notes),color:'',done:false})));
    return value.filter(p=>p&&validDate(p.date)).map(p=>({id:String(p.id||generateId()),date:p.date,title:String(p.title||'Untitled plan').slice(0,160),time:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.time||'')?p.time:'09:00',duration:Math.max(1,Math.min(527040,Math.round(Number(p.duration)||45))),taskId:typeof p.taskId==='string'?p.taskId:'',projectId:typeof p.projectId==='string'?p.projectId:'',notes:cleanNotes(p.notes),color:/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:'',done:!!p.done}));
  }
  function sanitizeGoal(item) {
    const goal = item && typeof item==='object' ? item : {};
    const status = STATUSES.some(s=>s.id===goal.status)?goal.status:'idea';
    const horizon = HORIZONS.some(h=>h.id===goal.horizon)?goal.horizon:'month';
    const rule = goal.rule && typeof goal.rule==='object' && typeof goal.rule.sourceId==='string' && goal.rule.sourceId!==goal.id && STATUSES.some(s=>s.id===goal.rule.trigger) && STATUSES.some(s=>s.id===goal.rule.target) ? {sourceId:goal.rule.sourceId,trigger:goal.rule.trigger,target:goal.rule.target}:null;
    const autoFrom = goal.autoFrom && typeof goal.autoFrom==='object' && typeof goal.autoFrom.sourceId==='string' && STATUSES.some(s=>s.id===goal.autoFrom.previousStatus) ? {sourceId:goal.autoFrom.sourceId,previousStatus:goal.autoFrom.previousStatus}:null;
    return {agenda:cleanAgenda(goal.agenda),notes:Array.isArray(goal.notes)?goal.notes.filter(n=>n&&typeof n.text==='string').map(n=>({id:String(n.id||generateId()),text:n.text.slice(0,2000),at:typeof n.at==='string'?n.at:null})):String(goal.description||'').split(/\n/).filter(t=>t.trim()).map(text=>({id:generateId(),text,at:null})),repeat:sanitizeRepeat(goal.repeat),flagColor:/^#[0-9a-f]{6}$/i.test(goal.flagColor||'')?goal.flagColor:null,flagShape:[0,1,2].includes(goal.flagShape)?goal.flagShape:null,position:Number.isFinite(goal.position)?goal.position:0,originalScheduledScope:['week','month','year'].includes(goal.originalScheduledScope)?goal.originalScheduledScope:(goal.milestoneScope||'week'),progress:[0,25,50,75].includes(goal.progress)?goal.progress:null,completedAt:typeof goal.completedAt==='string'?goal.completedAt:null,originalFinishDate:validDate(goal.originalFinishDate)?goal.originalFinishDate:'',originalScheduledDate:typeof goal.originalScheduledDate==='string'?goal.originalScheduledDate:(goal.milestoneDate||''),id:String(goal.id??generateId()),title:String(goal.title??'Untitled').slice(0,160),description:String(goal.description??''),horizon,status,due:typeof goal.due==='string'?goal.due:'',milestoneScope:['week','month','year'].includes(goal.milestoneScope)?goal.milestoneScope:'week',milestoneDate:typeof goal.milestoneDate==='string'?goal.milestoneDate:'',finishDate:validDate(goal.finishDate)&&goal.finishDate>=goal.milestoneDate?goal.finishDate:'',checkins:Array.isArray(goal.checkins)?[...new Set(goal.checkins.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)))]:[],parentId:typeof goal.parentId==='string'?goal.parentId:'',rule,autoFrom,createdAt:goal.createdAt??now(),updatedAt:goal.updatedAt??now()};
  }
  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored===null) return freshState();
      const parsed = JSON.parse(stored);
      if (parsed?.version!==1 || !Array.isArray(parsed.goals)) throw Error('Unsupported data format');
      const goals = parsed.goals.map(sanitizeGoal);
      if (new Set(goals.map(g=>g.id)).size!==goals.length) throw Error('Duplicate goal IDs');
      return {version:1,goals,events:readEvents(parsed.events),dayNotes:cleanDayNotes(parsed.dayNotes),schedule:cleanSchedule(parsed.schedule,goals),agendaWindow:cleanWindow(parsed.agendaWindow),calendarName:cleanCalendarName(parsed.calendarName),calendarHourHeight:cleanHourHeight(parsed.calendarHourHeight)};
    } catch(error) {alert('Saved planner data could not be read. A starter board was loaded without overwriting your existing data. Export or inspect browser storage before making changes.'); storageWritable=false; return freshState();}
  }
  let storageWritable = true;
  let plannerState = loadState();
  let currentHorizon = 'day';
  let selectedProject = '';
  let creatingProject = false;
  let activeView='report';
  let agendaDay=dayKey(localToday());let activeScheduleId=null;const selectedPlans=new Set();let scheduleDraft={title:'',time:'09:00',duration:45,taskId:'',projectId:''};let librarySearch='';let clockTarget='task';let clockPlanId=null;let calendarGesture=null;let pendingPlan=null;let calendarScale=56;let quarterTarget=null;let quarterHour=9;let quarterMinute=0;let quarterPeriod='AM';let planDateTarget=null;let agendaView='day';let dateRangeMode=false;let rangeStart='';let timeGoalId=null;let timeDate='';let wheelHour=9;let wheelMinute=0;
  let showAll = false;
  let editingId = null;
  let searchTerm = '';
  let toastTimer = null;
  let reschedulingId=null;
  let calendarMonth=null;
  let draggingId=null;
  let lastRenderedDay='';
  let activeSubtaskParent=null;
  let activePanelParent=null;
  let pullingTaskId=null;
  let pointerPull=null;
  let suppressPullClickUntil=0;
  let tagDirectoryId=null;
  let showAllTags=false;
  let draftNotes=[];let repeatEnabled=false;let connectionNode='';let markerGoalId=null;let quickNotesId=null;let repeatGoalId=null;let datePurpose='move';let reschedulingSessionDate=null;
  const configuredRepo=window.ORBIT_CONFIG?.feedbackRepo||'';
  const FEEDBACK_REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configuredRepo)?configuredRepo:'';
  const goalById = id => plannerState.goals.find(goal=>goal.id===id);
  const statusInfo = id => STATUSES.find(status=>status.id===id) || STATUSES[0];
  const horizonInfo = id => HORIZONS.find(horizon=>horizon.id===id) || HORIZONS[0];
  let fileSavingAvailable=false;
  let folderHandle=null;
  let pendingSave=false;
  let saveChain=Promise.resolve();
  async function rememberFolder(handle){
    try{
      const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('orbit-folder-access',1);request.onupgradeneeded=()=>request.result.createObjectStore('handles');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      return await new Promise((resolve,reject)=>{const tx=db.transaction('handles',handle?'readwrite':'readonly');const request=handle?tx.objectStore('handles').put(handle,'folder'):tx.objectStore('handles').get('folder');tx.oncomplete=()=>{db.close();resolve(request.result);};tx.onerror=()=>{db.close();reject(tx.error);};});
    }catch(error){return null;}
  }
  function persist() {
    pendingSave=true;
    if(!fileSavingAvailable){$('saveIndicator').textContent='Choose a save folder · changes not yet saved';return;}
    const snapshot=JSON.stringify(plannerState,null,2);
    const destination=folderHandle;
    $('saveIndicator').textContent='Saving to file…';
    saveChain=saveChain.catch(()=>{}).then(async()=>{
      let writable;
      try{
        const file=await destination.getFileHandle('planner-data.json',{create:true});
        writable=await file.createWritable();await writable.write(snapshot);await writable.close();writable=null;
        if(destination===folderHandle&&snapshot===JSON.stringify(plannerState,null,2)){pendingSave=false;$('saveIndicator').innerHTML='<span class="save-dot"></span> Saved to '+escapeHtml(folderHandle.name)+'/planner-data.json';}
      }catch(error){if(writable)try{await writable.abort();}catch(ignore){}$('saveIndicator').textContent='Not saved · reconnect your folder';fileSavingAvailable=false;showToast('Reconnect your save folder. Your changes are still open here.');}
    });
    return saveChain;
  }
  async function connectFolder(handle=null){
    try{
      const picked=handle||await window.showDirectoryPicker({id:'orbit-plans',mode:'readwrite'});
      if(await picked.queryPermission({mode:'readwrite'})!=='granted'&&await picked.requestPermission({mode:'readwrite'})!=='granted')throw Error('Folder permission is needed to save');
      let restored=null;
      const resumeUnsaved=picked===folderHandle&&pendingSave;
      try{
        if(resumeUnsaved)throw Object.assign(new Error('Resume unsaved changes'),{name:'NotFoundError'});
        const file=await picked.getFileHandle('planner-data.json');
        const parsed=JSON.parse(await (await file.getFile()).text());
        if(parsed?.version!==1||!Array.isArray(parsed.goals))throw Error('Invalid planner-data.json; existing file left untouched');
        const goals=parsed.goals.map(sanitizeGoal);
        if(new Set(goals.map(g=>g.id)).size!==goals.length)throw Error('Duplicate goal IDs; existing file left untouched');
        restored={version:1,goals,events:readEvents(parsed.events),dayNotes:cleanDayNotes(parsed.dayNotes),schedule:cleanSchedule(parsed.schedule,goals),agendaWindow:cleanWindow(parsed.agendaWindow),calendarName:cleanCalendarName(parsed.calendarName),calendarHourHeight:cleanHourHeight(parsed.calendarHourHeight)};
      }catch(error){if(error.name!=='NotFoundError')throw error;}
      if(restored&&pendingSave&&!confirm('This folder already has a saved plan. Load that plan instead of the unsaved changes currently open? Cancel keeps your current changes.'))return;
      if(restored)plannerState=restored;
      folderHandle=picked;fileSavingAvailable=true;pendingSave=false;
      await rememberFolder(picked);
      $('connectFolderBtn').textContent='Change folder';
      if(restored)$('saveIndicator').innerHTML='<span class="save-dot"></span> Saved to '+escapeHtml(picked.name)+'/planner-data.json';
      else await persist();
      render();
    }catch(error){if(error.name!=='AbortError'){showToast(error.message||'Could not open the save folder');$('saveIndicator').textContent='Folder not connected · nothing overwritten';}}
  }
  async function initializeFileSaving(){
    $('saveIndicator').textContent='Choose a folder for automatic file saving';
    if(!window.showDirectoryPicker){$('saveIndicator').textContent='Open in Google Chrome for folder autosave';$('connectFolderBtn').disabled=true;render();return;}
    const remembered=await rememberFolder();
    if(remembered){folderHandle=remembered;if(await remembered.queryPermission({mode:'readwrite'})==='granted')await connectFolder(remembered);else{$('connectFolderBtn').textContent='Reconnect folder';$('saveIndicator').textContent='Reconnect folder to load saved plans';}}
    render();
  }
  function showToast(message) {const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
  function reconcileDependencies() {
    // Apply active rules, undo automated moves once conditions cease. Run until stable for chained rules.
    for(let pass=0;pass<plannerState.goals.length+1;pass++) {
      let changed=false;
      for(const goal of plannerState.goals) {
        const rule=goal.rule;
        const source=rule ? goalById(rule.sourceId) : null;
        const active=!!(source && source.status===rule.trigger);
        if(active) {
          if(!goal.autoFrom) {goal.autoFrom={sourceId:rule.sourceId,previousStatus:goal.status};}
          if(goal.status!==rule.target) {goal.status=rule.target;goal.updatedAt=now();changed=true;}
        } else if(goal.autoFrom) {
          const previous=goal.autoFrom.previousStatus;
          goal.autoFrom=null;
          if(goal.status!==previous) {goal.status=previous;goal.updatedAt=now();changed=true;}
        }
      }
      if(!changed) break;
    }
  }
  function recordAction(type,goal,details={}){
    plannerState.events??=[];
    plannerState.events.push({id:generateId(),at:now(),type,goalId:goal.id,projectId:projectFor(goal).id,title:goal.title,progressSource:goal.status==='done'?'completion':goal.repeat?'session_ticks':plannerState.goals.some(g=>g.parentId===goal.id)?'subtasks':goal.progress==null?'unknown':'self_report',...details});
  }
  function effectiveProgress(goal,seen=new Set()){
    if(seen.has(goal.id))return null;const visited=new Set(seen);visited.add(goal.id);
    if(goal.repeat){const dates=repeatDates(goal.repeat);return dates.length?Math.round(dates.filter(d=>(goal.repeat.ticks??[]).includes(d)).length/dates.length*100):0;}
    if(goal.status==='done')return 100;
    const children=plannerState.goals.filter(g=>g.parentId===goal.id);
    if(children.length)return Math.round(children.reduce((sum,child)=>sum+(effectiveProgress(child,visited)??0),0)/children.length);
    return goal.progress??null;
  }
  function progressControl(goal){
    if(goal.repeat){const dates=repeatDates(goal.repeat),done=dates.filter(d=>goal.repeat.ticks.includes(d)).length;return `<button type="button" class="mini-progress habit-count" data-repeat-tracker="${escapeHtml(goal.id)}" title="Tick your sessions" aria-label="${escapeHtml(goal.title)}: ${done} of ${dates.length} sessions">${done}/${dates.length}</button>`;}
    const children=plannerState.goals.some(g=>g.parentId===goal.id);
    const value=effectiveProgress(goal);
    const label=value===null?'Set progress':value===0?'Not started':value===25?'Started':value===50?'Halfway':value===75?'Almost done':value===100?'Done':`${value}%`;
    const tip=children?`${value}% · from connected tasks`:goal.status==='done'?'Done · reopen to update progress':`${label} · click to change`;
    return `<button type="button" class="mini-progress ${value===null?'unknown':''}" data-progress="${escapeHtml(goal.id)}" ${children||goal.status==='done'?'disabled':''} title="${tip}" aria-label="${escapeHtml(goal.title)}: ${tip}"><span class="mini-progress-track"><i style="width:${value??0}%"></i></span><span>${label}</span></button>`;
  }
  function advanceProgress(id){
    const goal=goalById(id);if(!goal||goal.status==='done'||plannerState.goals.some(g=>g.parentId===id))return;
    const previous=goal.progress??null;
    if(previous===75){setGoalStatus(id,'done');return;}
    const next=previous===null||previous===0?25:previous===25?50:75;
    const fromStatus=goal.status;goal.progress=next;goal.status='progress';
    goal.updatedAt=now();recordAction('progress_changed',goal,{from:previous,to:next,fromStatus,toStatus:goal.status,scheduledDate:goal.milestoneDate||null});persist();refreshTaskViews();
  }
  function applyGoalStatus(goal,newStatus){
    if(goal?.repeat&&newStatus==='done'&&effectiveProgress(goal)<100){openRepeatTracker(goal.id);return false;}
    if(!goal||goal.status===newStatus||!STATUSES.some(s=>s.id===newStatus))return false;
    const previous=goal.status;const previousCompletedAt=goal.completedAt??null;
    goal.rule=null;goal.status=newStatus;goal.autoFrom=null;goal.updatedAt=now();
    goal.completedAt=newStatus==='done'?now():null;
    recordAction(newStatus==='done'?'completed':previous==='done'?'reopened':newStatus==='failed'?'failed':'status_changed',goal,{from:previous,to:newStatus,progress:effectiveProgress(goal),scheduledDate:goal.milestoneDate||null,originalScheduledDate:goal.originalScheduledDate||goal.milestoneDate||null,previousCompletedAt});
    return true;
  }
  function setGoalStatus(id,newStatus) {
    if(!applyGoalStatus(goalById(id),newStatus))return;
    persist();refreshTaskViews();
  }
  const boardStatus=goal=>['blocked','idea'].includes(goal.status)?'todo':goal.status;
  const byPosition=(a,b)=>(a.position??0)-(b.position??0);
  function moveTask(id,status,targetId=null,after=false){
    const goal=goalById(id);if(!goal||!['todo','progress','done','failed'].includes(status)||targetId===id)return;
    if(goal.repeat&&status==='done'&&effectiveProgress(goal)<100){openRepeatTracker(id);return;}
    const originalStatus=boardStatus(goal);
    const original=plannerState.goals.filter(g=>g.parentId&&goalById(g.parentId)&&boardStatus(g)===originalStatus).sort(byPosition);
    const fromIndex=original.findIndex(g=>g.id===id);
    const destination=plannerState.goals.filter(g=>g.id!==id&&g.parentId&&goalById(g.parentId)&&boardStatus(g)===status).sort(byPosition);
    const targetIndex=destination.findIndex(g=>g.id===targetId);
    const toIndex=targetIndex<0?destination.length:targetIndex+(after?1:0);
    destination.splice(toIndex,0,goal);
    if(originalStatus===status&&original.map(g=>g.id).join('|')===destination.map(g=>g.id).join('|'))return;
    const statusChanged=originalStatus!==status?applyGoalStatus(goal,status):false;
    destination.forEach((g,i)=>{g.position=i;});goal.updatedAt=now();
    recordAction('priority_changed',goal,{fromIndex,toIndex,fromStatus:originalStatus,toStatus:status,beforeId:destination[toIndex+1]?.id??null,afterId:destination[toIndex-1]?.id??null,statusChanged});
    persist();refreshTaskViews();
  }
  function placeTaskBeside(id,targetId,after=false){
    const goal=goalById(id),target=goalById(targetId);
    if(!goal||!target||id===targetId||!goal.parentId||!target.parentId)return;
    if(target.parentId===id||isDescendant(target.parentId,id)){showToast('That connection would make a loop. Nothing changed.');return;}
    if(goal.parentId!==target.parentId)connectTask(id,target.parentId);
    const siblings=plannerState.goals.filter(g=>g.parentId===target.parentId&&g.id!==id).sort(byPosition);
    const index=siblings.findIndex(g=>g.id===targetId)+(after?1:0);siblings.splice(index,0,goal);
    siblings.forEach((g,i)=>{g.position=i;});goal.updatedAt=now();
    recordAction('priority_changed',goal,{parentId:goal.parentId,toIndex:index,source:'drag_order'});
    persist();refreshTaskViews();renderEditorTree();
  }
  function carryoverDays(goal,today=localToday()){
    if(['done','failed'].includes(goal.status))return 0;
    if(goal.repeat){const missed=repeatDates({...goal.repeat,moves:{}}).filter(d=>d<dayKey(today)&&!goal.repeat.ticks.includes(goal.repeat.moves?.[d]||d));if(!missed.length)return 0;const d=new Date(missed[0]+'T12:00:00');return Math.max(0,Math.floor((Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())-Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))/86400000));}
    const first=goal.originalFinishDate||goal.finishDate||goal.originalScheduledDate||goal.milestoneDate;if(!first)return 0;
    const scope=goal.originalScheduledScope||goal.milestoneScope;
    let due=new Date(first+'T12:00:00');if(Number.isNaN(due.getTime()))return 0;
    if(!goal.finishDate&&scope==='year')due=addDays(PLAN_END,-1);
    else if(!goal.finishDate&&scope==='month'){
      const period=Array.from({length:12},(_,m)=>[new Date(2026,9+m,20,12),new Date(2026,10+m,20,12)]).find(([start,end])=>due>=start&&due<end);
      if(period)due=addDays(period[1],-1);
    }
    const days=Math.floor((Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())-Date.UTC(due.getFullYear(),due.getMonth(),due.getDate()))/86400000);
    return Math.max(0,days);
  }
  function carryoverStyle(days){return days?`--carry-color:hsl(5 57% ${Math.max(32,70-days*2)}%);--carry-tint:${Math.min(22,6+days)}%;`:'';}
  function localToday(){const date=new Date();return new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);}
  function rescheduleGoal(id,date){
    const goal=goalById(id);if(!goal||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const parsed=new Date(date+'T12:00:00');if(Number.isNaN(parsed.getTime())||dayKey(parsed)!==date)return;
    if(goal.repeat){
      const sessions=repeatDates(goal.repeat);const pending=sessions.filter(d=>!goal.repeat.ticks.includes(d));
      const previous=reschedulingSessionDate||pending.find(d=>d>=dayKey(localToday()))||pending[0];
      if(!previous){showToast('All sessions are done. Reset this goal to restart it.');return;}
      if(previous===date){closeReschedule();return;}
      if(sessions.includes(date)){showToast('That day already has a session. Choose another day.');return;}
      const base=Object.entries(goal.repeat.moves||{}).find(([,moved])=>moved===previous)?.[0]||previous;
      goal.repeat.moves={...goal.repeat.moves,[base]:date};goal.updatedAt=now();
      recordAction('rescheduled',goal,{from:previous,to:date,originalScheduledDate:base,scope:'session',progress:effectiveProgress(goal),status:goal.status});
      closeReschedule();persist();refreshTaskViews();showToast(`Session moved to ${shortDate(parsed)} · other sessions kept`);return;
    }
    const previous=goal.milestoneDate||null;if(previous===date){closeReschedule();return;}
    goal.originalScheduledScope=goal.originalScheduledScope||goal.milestoneScope||'week';
    goal.originalScheduledDate=goal.originalScheduledDate||previous||date;
    if(goal.finishDate&&previous){const duration=Math.round((new Date(goal.finishDate+'T12:00:00')-new Date(previous+'T12:00:00'))/86400000);goal.originalFinishDate=goal.originalFinishDate||goal.finishDate;goal.finishDate=dayKey(addDays(parsed,duration));}
    goal.milestoneDate=date;goal.updatedAt=now();
    recordAction(previous?'rescheduled':'scheduled',goal,{from:previous,to:date,progress:effectiveProgress(goal),status:goal.status,originalScheduledDate:goal.originalScheduledDate,source:'quick_move'});
    closeReschedule();persist();refreshTaskViews();showToast(`Moved to ${shortDate(parsed)} · progress kept`);
  }
  function openReschedule(id){
    const goal=goalById(id);if(!goal)return;
    datePurpose='move';reschedulingId=id;const pending=goal.repeat?repeatDates(goal.repeat).filter(d=>!goal.repeat.ticks.includes(d)):[];reschedulingSessionDate=goal.repeat?(pending.find(d=>d>=dayKey(localToday()))||pending[0]||null):null;const calendarDate=reschedulingSessionDate||goal.milestoneDate;calendarMonth=calendarDate?new Date(calendarDate+'T12:00:00'):localToday();calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1,12);
    $('calendarTitle').textContent='Move to another day';$('calendarNote').textContent='Progress stays intact. Moving a repeating goal moves one pending session.';
    $('moveTomorrowBtn').hidden=false;$('rescheduleTaskName').textContent=goal.title+(reschedulingSessionDate?' · '+shortDate(new Date(reschedulingSessionDate+'T12:00:00')):'');renderCalendar();if(!$('rescheduleDialog').open)$('rescheduleDialog').showModal();
  }
  function closeReschedule(){if($('rescheduleDialog').open)$('rescheduleDialog').close();reschedulingId=null;reschedulingSessionDate=null;}
  function renderCalendar(){
    const monthName=d=>d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const next=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1,12);
    $('calendarMonth').textContent=monthName(calendarMonth)+' — '+monthName(next);
    const draft=!['move','agenda'].includes(datePurpose);$('dateSelectionModes').hidden=!draft||repeatEnabled||datePurpose==='plan-range';
    document.querySelectorAll('[data-date-mode]').forEach(el=>el.classList.toggle('selected',(el.dataset.dateMode==='range')===dateRangeMode));
    const selected=datePurpose==='plan-range'?planById(planDateTarget)?.date:datePurpose==='agenda'?agendaDay:datePurpose==='move'?(reschedulingSessionDate||goalById(reschedulingId)?.milestoneDate):$('fieldMilestone').value;
    const finish=datePurpose==='plan-range'?planLastDay(planById(planDateTarget)):$('fieldFinish').value;
    const weekdays='<div class="calendar-weekdays">'+['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=>'<span>'+d+'</span>').join('')+'</div>';
    $('rescheduleCalendar').innerHTML=[calendarMonth,next].map(month=>{
      const first=(month.getDay()+6)%7,count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
      return '<section class="calendar-month"><h3>'+monthName(month)+'</h3>'+weekdays+'<div class="month-days">'+Array.from({length:first},()=>'<span></span>').join('')+Array.from({length:count},(_,i)=>{
        const date=dayKey(new Date(month.getFullYear(),month.getMonth(),i+1,12));const endpoint=date===selected||date===finish||date===rangeStart;
        return `<button type="button" class="calendar-day ${endpoint?'selected':''} ${date===dayKey(localToday())?'today':''} ${draft&&finish&&date>selected&&date<finish?'in-range':''}" data-move-date="${date}" aria-label="${date}">${i+1}</button>`;
      }).join('')+'</div></section>';
    }).join('');
  }
  function selectCalendarDate(date){
    if(datePurpose==='plan-range'){
      if(!rangeStart){rangeStart=date;$('calendarNote').textContent='Now choose the last day.';renderCalendar();return;}
      const plan=planById(planDateTarget),previous={date:plan.date,time:plan.time,duration:plan.duration},start=date<rangeStart?date:rangeStart,finish=date<rangeStart?rangeStart:date;plan.date=start;stretchPlanToDay(plan,finish,previous);agendaDay=start;
      if(plan!==pendingPlan){recordPlanEvent('plan_dates_changed',plan,{from:previous,to:{date:plan.date,duration:plan.duration}});persist();}closeReschedule();renderReport();return;
    }

    if(datePurpose==='agenda'){agendaDay=date;activeScheduleId=null;closeReschedule();renderReport();return;}
    if(datePurpose==='move'){rescheduleGoal(reschedulingId,date);return;}
    if(repeatEnabled){
      if(datePurpose==='end'&&date<$('fieldMilestone').value){showToast('Finish must follow the first session.');return;}
      $(datePurpose==='end'?'fieldRepeatEnd':'fieldMilestone').value=date;
    }else if(dateRangeMode){
      if(!rangeStart){rangeStart=date;$('calendarNote').textContent='Now click the finish date.';renderCalendar();return;}
      $('fieldMilestone').value=date<rangeStart?date:rangeStart;$('fieldFinish').value=date<rangeStart?rangeStart:date;
      if($('fieldFinish').value===$('fieldMilestone').value)$('fieldFinish').value='';
    }else{$('fieldMilestone').value=date;$('fieldFinish').value='';}
    $('fieldScope').value='week';closeReschedule();updateScheduleUI();
  }
  function renderNav() {
    const projects=plannerState.goals.filter(g=>!g.parentId||!goalById(g.parentId));
    if(selectedProject&&!projects.some(g=>g.id===selectedProject))selectedProject='';
    const navigation=`<button type="button" class="project-tab ${!selectedProject?'active':''}" data-project="" aria-pressed="${!selectedProject}">All projects</button>`+projects.map(g=>`<button type="button" class="project-tab ${selectedProject===g.id?'active':''}" style="--project-color:${projectColor(g)}" data-project="${escapeHtml(g.id)}" data-child-drop="${escapeHtml(g.id)}" aria-pressed="${selectedProject===g.id}"><span class="project-dot"></span>${escapeHtml(g.title)}</button>`).join('');
    if($('projectNav').innerHTML!==navigation)$('projectNav').innerHTML=navigation;
    $('editProjectBtn').hidden=!selectedProject;
  }
  function focusSubtaskInput(){
    const input=Array.from($('board').querySelectorAll('[data-new-subtask]')).find(el=>el.dataset.newSubtask===activeSubtaskParent);input?.focus({preventScroll:true});
  }
  function addInlineSubtask(parentId,title,context='board'){
    const parent=goalById(parentId);title=title.trim();if(!parent||!title)return;
    const scope=parent.milestoneScope||'week',date=parent.milestoneDate||'';
    const goal=sanitizeGoal({id:generateId(),title,parentId,status:'todo',horizon:parent.horizon,milestoneScope:scope,milestoneDate:date,finishDate:parent.finishDate||'',originalScheduledDate:date,originalScheduledScope:scope,position:Math.max(-1,...plannerState.goals.filter(g=>g.parentId===parentId).map(g=>g.position??0))+1,notes:[],description:'',createdAt:now(),updatedAt:now()});
    plannerState.goals.push(goal);recordAction('created',goal,{parentId,source:'inline_subtask',scheduledDate:date||null,status:'todo'});
    if(parent.status==='done'&&!parent.repeat)applyGoalStatus(parent,'progress');
    searchTerm='';$('searchInput').value='';persist();refreshTaskViews();if(context==='panel'){updateConnectionUI();renderEditorTree();focusPanelInput();}else focusSubtaskInput();
  }
  function renderBoard() {
    const scoped=plannerState.goals.filter(goal=>goal.parentId&&goalById(goal.parentId)&&(!selectedProject||projectFor(goal).id===selectedProject));
    const visible=new Set();
    for(const goal of scoped){
      if(!searchTerm||`${goal.title} ${goal.description}`.toLowerCase().includes(searchTerm)){
        visible.add(goal.id);let ancestor=goalById(goal.parentId),seen=new Set();
        while(ancestor?.parentId&&!seen.has(ancestor.id)){seen.add(ancestor.id);visible.add(ancestor.id);ancestor=goalById(ancestor.parentId);}
        if(searchTerm)for(const child of scoped)if(isDescendant(child.id,goal.id))visible.add(child.id);
      }
    }
    const goals=scoped.filter(goal=>visible.has(goal.id));
    const roots=goals.filter(goal=>!visible.has(goal.parentId)).sort(byPosition);
    $('goalCount').textContent=`${goals.length} task${goals.length===1?'':'s'}`;
    $('boardHeading').textContent=selectedProject?goalById(selectedProject).title:'All projects';
    $('boardDescription').textContent='Subtasks stay beneath their parent and keep their own progress.';
    $('viewName').textContent='Tasks';
    const columns=STATUSES.filter(status=>['todo','progress','done','failed'].includes(status.id));
    function branch(goal,depth,seen=new Set()){
      if(seen.has(goal.id))return '';const visited=new Set(seen);visited.add(goal.id);
      const children=goals.filter(child=>child.parentId===goal.id).sort(byPosition);
      return `<div class="task-branch" data-branch-id="${escapeHtml(goal.id)}">${renderCard(goal,depth)}${activeSubtaskParent===goal.id?`<div class="inline-subtask"><span>↳</span><input data-new-subtask="${escapeHtml(goal.id)}" aria-label="New subtask for ${escapeHtml(goal.title)}" placeholder="Subtask name · Enter to add" maxlength="160"><button type="button" data-cancel-subtask aria-label="Close new subtask">×</button></div>`:''}${children.length?`<div class="subtask-list">${children.map(child=>branch(child,depth+1,visited)).join('')}</div>`:''}</div>`;
    }
    $('board').innerHTML=columns.map(status=>{
      const parents=roots.filter(goal=>boardStatus(goal)===status.id);
      const count=goals.filter(goal=>parents.some(parent=>goal.id===parent.id||isDescendant(goal.id,parent.id))).length;
      return `<div class="bucket" data-status="${status.id}"><div class="bucket-head"><div class="bucket-title"><span class="bucket-icon" style="--status-color:${status.color};--status-bg:${status.bg}">${status.icon}</span>${status.label}</div><span class="bucket-count">${count}</span></div><div class="bucket-body">${parents.length?parents.map(goal=>branch(goal,0)).join(''):'<div class="empty-bucket">No tasks yet</div>'}</div><button class="bucket-add" data-add-status="${status.id}">＋ Add task</button></div>`;
    }).join('');
  }
  const PROJECT_COLORS=['#7661c4','#267d69','#b76b27','#397bc1','#b35080','#6d8633','#a8573e','#477d88'];
  function projectFor(goal){
    const seen=new Set();let current=goal;
    while(current.parentId&&goalById(current.parentId)&&!seen.has(current.parentId)){seen.add(current.id);current=goalById(current.parentId);}
    return current;
  }
  function projectColor(project){
    let hash=0;for(const char of project.id)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
    return PROJECT_COLORS[hash%PROJECT_COLORS.length];
  }
  const repeatCache=new WeakMap();
  function repeatDates(repeat){
    if(!repeat||!validDate(repeat.start)||!validDate(repeat.end))return [];
    const key=[repeat.start,repeat.end,repeat.interval,repeat.unit,JSON.stringify(repeat.moves||{})].join('|');
    const cached=repeatCache.get(repeat);if(cached?.key===key)return cached.dates;
    const start=new Date(repeat.start+'T12:00:00');const dates=[];
    for(let i=0;i<2000;i++){
      let date;
      if(repeat.unit==='month'){
        const month=start.getMonth()+i*repeat.interval;const base=new Date(start.getFullYear(),month,1,12);
        date=new Date(base.getFullYear(),base.getMonth(),Math.min(start.getDate(),new Date(base.getFullYear(),base.getMonth()+1,0).getDate()),12);
      }else date=addDays(start,i*repeat.interval*(repeat.unit==='week'?7:1));
      const key=dayKey(date);if(key>repeat.end)break;dates.push(key);
    }
    const result=[...new Set(dates.map(date=>repeat.moves?.[date]||date))].sort();repeatCache.set(repeat,{key,dates:result});return result;
  }
  function syncRepeatStatus(goal){
    const dates=repeatDates(goal.repeat),count=dates.filter(d=>goal.repeat.ticks.includes(d)).length;
    const previous=goal.status;goal.status=count===dates.length&&dates.length?'done':count?'progress':'todo';
    goal.completedAt=goal.status==='done'?(goal.completedAt||now()):null;
    if(previous!==goal.status)recordAction(goal.status==='done'?'completed':previous==='done'?'reopened':'status_changed',goal,{from:previous,to:goal.status,source:'session_ticks',sessions:count,total:dates.length});
  }
  function toggleRepeatTick(id,date){
    const goal=goalById(id);if(!goal?.repeat||!repeatDates(goal.repeat).includes(date))return;
    const had=goal.repeat.ticks.includes(date);goal.repeat.ticks=had?goal.repeat.ticks.filter(d=>d!==date):[...goal.repeat.ticks,date];
    recordAction('session_toggled',goal,{date,done:!had,progress:effectiveProgress(goal),sessions:goal.repeat.ticks.filter(d=>repeatDates(goal.repeat).includes(d)).length,total:repeatDates(goal.repeat).length});syncRepeatStatus(goal);goal.updatedAt=now();persist();refreshTaskViews();
    if($('repeatDialog').open&&repeatGoalId===id)renderRepeatTracker();
  }
  function openRepeatTracker(id){repeatGoalId=id;renderRepeatTracker();if(!$('repeatDialog').open)$('repeatDialog').showModal();}
  function renderRepeatTracker(){
    const goal=goalById(repeatGoalId);if(!goal?.repeat)return;
    const dates=repeatDates(goal.repeat),count=dates.filter(d=>goal.repeat.ticks.includes(d)).length;
    $('repeatTitle').textContent=goal.title;$('repeatCount').textContent=`${count}/${dates.length} · every ${goal.repeat.interval} ${goal.repeat.unit}${goal.repeat.interval===1?'':'s'}`;
    $('repeatSessions').innerHTML=dates.map(date=>`<button class="session-tick ${goal.repeat.ticks.includes(date)?'checked':''} ${date===dayKey(localToday())?'today':''}" data-repeat-tick="${escapeHtml(goal.id)}" data-session-date="${date}" aria-pressed="${goal.repeat.ticks.includes(date)}" aria-label="${escapeHtml(goal.title)} · ${date}"><span>${shortDate(new Date(date+'T12:00:00'))}</span><b>${goal.repeat.ticks.includes(date)?'✓':'○'}</b></button>`).join('');
  }
  function resetProgress(id){
    const goal=goalById(id);if(!goal)return;
    if(!goal.repeat&&plannerState.goals.some(g=>g.parentId===id)){showToast('This progress comes from subtasks. Reset the subtask you want to restart.');return;}
    const from={status:goal.status,progress:effectiveProgress(goal),ticks:goal.repeat?[...goal.repeat.ticks]:null};
    goal.progress=0;goal.status='todo';goal.completedAt=null;if(goal.repeat)goal.repeat.ticks=[];
    goal.updatedAt=now();recordAction('progress_reset',goal,{from,to:{status:'todo',progress:0},scheduledDate:goal.milestoneDate||null});persist();refreshTaskViews();
    if($('repeatDialog').open&&repeatGoalId===id)renderRepeatTracker();showToast('Progress reset · history kept');
  }
  function openDraftDate(purpose){
    datePurpose=purpose;reschedulingId=null;rangeStart='';dateRangeMode=!repeatEnabled&&(purpose==='start'||!!$('fieldFinish').value);
    const value=purpose==='end'?$('fieldRepeatEnd').value:$('fieldMilestone').value;
    const date=validDate(value)?new Date(value+'T12:00:00'):localToday();calendarMonth=new Date(date.getFullYear(),date.getMonth(),1,12);
    $('calendarTitle').textContent=repeatEnabled?(purpose==='end'?'Last session':'First session'):'When is it due?';
    $('calendarNote').textContent=dateRangeMode?'Click a start date, then a finish date.':'Click one day to set the finish date. Start is optional.';
    $('rescheduleTaskName').textContent=$('fieldTitle').value||'Task dates';$('moveTomorrowBtn').hidden=true;renderCalendar();$('rescheduleDialog').showModal();
  }
  function readRepeatDraft(){
    if(!repeatEnabled)return null;
    const interval=Number($('repeatInterval').value);if(!Number.isInteger(interval)||interval<1||interval>365)return null;
    return sanitizeRepeat({start:$('fieldMilestone').value,end:$('fieldRepeatEnd').value,interval,unit:$('fieldRepeatUnit').value,ticks:[]});
  }
  function updateScheduleUI(){
    $('repeatToggle').textContent=repeatEnabled?'↻ Repeats':'↻ Repeat';$('repeatToggle').setAttribute('aria-pressed',String(repeatEnabled));$('repeatSettings').hidden=!repeatEnabled;
    const start=$('fieldMilestone').value,end=$('fieldRepeatEnd').value;
    const finish=repeatEnabled?end:($('fieldFinish').value||start);
    const begin=repeatEnabled?start:($('fieldFinish').value?start:'');
    $('chooseGoalDate').textContent=begin?`Start · ${shortDate(new Date(begin+'T12:00:00'))}`:'＋ Start';
    $('chooseFinishDate').textContent=finish?`Finish · ${shortDate(new Date(finish+'T12:00:00'))}`:'Finish · Choose';
    $('chooseFinishDate').hidden=false;$('clearFinishDate').hidden=repeatEnabled||!$('fieldFinish').value;
    $('chooseRepeatEnd').textContent=end?`Until ${shortDate(new Date(end+'T12:00:00'))}`:'Until…';
    document.querySelectorAll('[data-repeat-unit]').forEach(button=>button.classList.toggle('selected',button.dataset.repeatUnit===$('fieldRepeatUnit').value));
    const repeat=readRepeatDraft();$('repeatPreview').textContent=repeat?`${repeatDates(repeat).length} sessions · tick once per session`:repeatEnabled?'Choose the first and last day.':'';
  }
  function notesFor(goal){return goal.notes??String(goal.description||'').split(/\n/).filter(Boolean).map(text=>({id:generateId(),text,at:null}));}
  function notesHTML(notes,context){return notes.map(note=>`<div class="bullet-note"><span>•</span><input value="${escapeHtml(note.text)}" data-edit-note="${escapeHtml(note.id)}" data-notes-context="${context}" aria-label="Edit note" maxlength="2000"><button type="button" data-remove-note="${escapeHtml(note.id)}" data-notes-context="${context}" aria-label="Remove note">×</button></div>`).join('');}
  function renderDraftNotes(){$('editorNotes').innerHTML=notesHTML(draftNotes,'draft');$('fieldDescription').value=draftNotes.map(n=>n.text).join('\n');}
  function addDraftInput(){const text=$('editorNoteInput').value.trim();if(!text)return;draftNotes.push({id:generateId(),text,at:now()});$('editorNoteInput').value='';renderDraftNotes();}
  function openQuickNotes(id){const goal=goalById(id);if(!goal)return;quickNotesId=id;goal.notes=notesFor(goal);$('quickNotesTitle').textContent=goal.title;$('quickNotes').innerHTML=notesHTML(goal.notes,'quick');$('quickNoteInput').value='';$('notesDialog').showModal();$('quickNoteInput').focus();}
  function saveQuickNotes(goal,type,details){goal.description=goal.notes.map(n=>n.text).join('\n');goal.updatedAt=now();recordAction(type,goal,details);persist();refreshTaskViews();$('quickNotes').innerHTML=notesHTML(goal.notes,'quick');}
  function addQuickNote(){const goal=goalById(quickNotesId),text=$('quickNoteInput').value.trim();if(!goal||!text)return;const note={id:generateId(),text,at:now()};goal.notes.push(note);saveQuickNotes(goal,'note_added',{note});$('quickNoteInput').value='';$('quickNoteInput').focus();}
  function removeNote(id,context){if(context==='draft'){draftNotes=draftNotes.filter(n=>n.id!==id);renderDraftNotes();}else{const goal=goalById(quickNotesId);if(!goal)return;const note=goal.notes.find(n=>n.id===id);goal.notes=goal.notes.filter(n=>n.id!==id);saveQuickNotes(goal,'note_removed',{note});}}
  function editNote(id,text,context){const notes=context==='draft'?draftNotes:goalById(quickNotesId)?.notes;const note=notes?.find(n=>n.id===id);if(!note||note.text===text.trim())return;if(!text.trim()){removeNote(id,context);return;}const previous=note.text;note.text=text.trim();if(context==='draft')renderDraftNotes();else saveQuickNotes(goalById(quickNotesId),'note_edited',{noteId:id,from:previous,to:note.text});}
  function connectionPath(id){
    const path=[];let goal=goalById(id),seen=new Set();
    while(goal&&!seen.has(goal.id)){seen.add(goal.id);path.unshift(goal);goal=goalById(goal.parentId);}return path;
  }
  function currentTagProject(){
    if(creatingProject&&!editingId)return null;
    const goal=goalById(editingId)||goalById($('fieldParent').value)||goalById(selectedProject);return goal?projectFor(goal).id:null;
  }
  function directoryTags(id){return plannerState.goals.filter(goal=>goal.parentId&&isDescendant(goal.id,id));}
  function mostUsedTasks(){
    const projectId=currentTagProject();if(!projectId)return [];
    if(tagDirectoryId&&projectFor(goalById(tagDirectoryId)||goalById(projectId)).id!==projectId)tagDirectoryId=null;
    const scores=new Map();for(const event of plannerState.events||[])for(const id of [event.goalId,event.parentId,event.to?.parentId])if(typeof id==='string')scores.set(id,(scores.get(id)||0)+1);
    const pool=tagDirectoryId?directoryTags(tagDirectoryId):plannerState.goals.filter(goal=>goal.parentId&&projectFor(goal).id===projectId);
    return pool.sort((a,b)=>(scores.get(b.id)||0)-(scores.get(a.id)||0)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  }
  function updateConnectionUI(){
    const parent=goalById($('fieldParent').value),path=parent?connectionPath(parent.id):[];
    $('chooseConnection').innerHTML=parent?path.map((goal,index)=>{const tags=directoryTags(goal.id),list=tags.map(g=>g.title).join('\n');return `<button type="button" draggable="false" class="directory-crumb ${tagDirectoryId===goal.id?'selected':''}" data-directory="${escapeHtml(goal.id)}" data-panel-task="${escapeHtml(goal.id)}" data-child-drop="${escapeHtml(goal.id)}" title="${escapeHtml(goal.title)} · ${tags.length} tags${list?'\n'+escapeHtml(list):''}">${index===0?'Project: ':''}${escapeHtml(goal.title)}</button>`;}).join('<b>›</b>'):'Drop a task here to set its parent';
    $('chooseConnection').title='Drop a parent here. Click a directory to edit its name and see its tags.';
    const tags=mostUsedTasks(),visible=showAllTags?tags:tags.slice(0,5);const scope=goalById(tagDirectoryId);
    $('tagsLabel').textContent=`${scope?scope.title:'Project tags'} · ${visible.length}/${tags.length}`;
    $('allTagsBtn').hidden=tags.length<=5;$('allTagsBtn').textContent=showAllTags?'Top 5':`+${Math.max(0,tags.length-5)} more`;
    $('pullSuggestions').innerHTML=visible.map(goal=>`<button type="button" draggable="false" class="pull-task" data-pull-task="${escapeHtml(goal.id)}" title="${escapeHtml(goal.title)} · drag to connect" aria-label="Pull ${escapeHtml(goal.title)}"><span class="task-flag flag-${flagFor(goal).shape}" style="--flag-color:${flagFor(goal).color}"></span>${escapeHtml(goal.title)}</button>`).join('')||'<span class="field-tip">No task tags in this project yet.</span>';
    $('directoryDetails').hidden=!scope;if(scope){$('directoryName').value=scope.title;$('directoryTagCount').textContent=`${directoryTags(scope.id).length} associated tags · drag to change hierarchy`;}
  }
  function inspectDirectory(id){tagDirectoryId=id;showAllTags=false;updateConnectionUI();}
  function renameDirectory(){
    const goal=goalById(tagDirectoryId),title=$('directoryName').value.trim();if(!goal||!title||title===goal.title)return;
    const previous=goal.title;goal.title=title;goal.updatedAt=now();recordAction('renamed',goal,{from:previous,to:title});if(editingId===goal.id)$('fieldTitle').value=title;
    persist();renderNav();refreshTaskViews();updateConnectionUI();
  }
  function focusPanelInput(){const input=Array.from($('connectedGoals').querySelectorAll('[data-new-panel-subtask]')).find(el=>el.dataset.newPanelSubtask===activePanelParent);input?.focus({preventScroll:true});}
  function renderEditorTree(){
    const root=goalById(editingId);if(!root){$('connectedGoals').innerHTML='<label>Subtasks</label><div class="inline-subtask"><span>↳</span><input data-new-draft-subtask aria-label="New subtask" placeholder="Subtask name · Enter to add" maxlength="160"></div>';return;}
    function node(goal,seen=new Set()){
      if(seen.has(goal.id))return '';const next=new Set(seen);next.add(goal.id);
      const children=plannerState.goals.filter(child=>child.parentId===goal.id).sort(byPosition);
      return `<div class="panel-branch"><div class="panel-node" draggable="false" data-panel-task="${escapeHtml(goal.id)}" data-child-drop="${escapeHtml(goal.id)}"><span class="drag-grip" aria-hidden="true" title="Drag to move">⠿</span><span class="task-flag flag-${flagFor(goal).shape}" style="--flag-color:${flagFor(goal).color}"></span><button type="button" class="panel-task-title" data-edit="${escapeHtml(goal.id)}" title="${escapeHtml(goal.title)}">${escapeHtml(goal.title)}</button><span class="subtask-status status-${boardStatus(goal)}">${statusInfo(boardStatus(goal)).label}</span><button type="button" class="row-icon" data-add-panel-child="${escapeHtml(goal.id)}" aria-label="Add subtask under ${escapeHtml(goal.title)}" title="Add subtask">＋</button></div>${activePanelParent===goal.id?`<div class="inline-subtask"><span>↳</span><input data-new-panel-subtask="${escapeHtml(goal.id)}" aria-label="New subtask under ${escapeHtml(goal.title)}" placeholder="Subtask name · Enter to add" maxlength="160"></div>`:''}${children.length?`<div class="panel-subtasks">${children.map(child=>node(child,next)).join('')}</div>`:''}</div>`;
    }
    $('connectedGoals').innerHTML='<label>Task tree · drag ⠿ · edges reorder, center nests</label>'+node(root);
  }
  function connectTask(childId,parentId){
    const child=goalById(childId),parent=goalById(parentId);
    if(!child||!parent||childId===parentId||isDescendant(parentId,childId)){showToast('That connection would make a loop. Nothing changed.');return;}
    if(!child.parentId){showToast('Projects stay at the top. Pull one of their tasks instead.');return;}
    if(child.parentId===parentId)return;
    const previous=child.parentId,previousProject=projectFor(child).id;
    child.parentId=parentId;child.position=Math.max(-1,...plannerState.goals.filter(g=>g.id!==childId&&g.parentId===parentId).map(g=>g.position||0))+1;child.updatedAt=now();
    recordAction('reparented',child,{from:previous,to:parentId,previousProjectId:previousProject,projectId:projectFor(child).id,source:'drag_connection'});
    if(parent.status==='done'&&!parent.repeat)applyGoalStatus(parent,'progress');
    if(editingId===childId)$('fieldParent').value=parentId;
    if(selectedProject)selectedProject=projectFor(child).id;
    persist();renderNav();refreshTaskViews();updateConnectionUI();renderEditorTree();showToast('Connected · hierarchy updated');
  }
  function setEditorParent(parentId){
    if(parentId===editingId||editingId&&isDescendant(parentId,editingId)){showToast('That connection would make a loop. Nothing changed.');return;}
    if(!goalById(parentId))return;
    if(editingId)connectTask(editingId,parentId);else{$('fieldParent').value=parentId;updateConnectionUI();}
  }
  function flagFor(goal){
    let current=goal,seen=new Set();while(current&&!seen.has(current.id)){seen.add(current.id);if(current.flagColor)return {color:current.flagColor,shape:current.flagShape??0};current=goalById(current.parentId);}
    let branch=goal;const branches=new Set();while(branch.parentId&&goalById(branch.parentId)?.parentId&&!branches.has(branch.id)){branches.add(branch.id);branch=goalById(branch.parentId);}
    let hash=0;for(const char of branch.id)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
    return {color:PROJECT_COLORS[hash%PROJECT_COLORS.length],shape:goal.flagShape??hash%3};
  }
  function flagButton(goal){const flag=flagFor(goal);return `<button class="flag-button" data-marker="${escapeHtml(goal.id)}" title="Change task marker" aria-label="Change marker for ${escapeHtml(goal.title)}"><span class="task-flag flag-${flag.shape}" style="--flag-color:${flag.color}"></span></button>`;}
  function openMarker(id){markerGoalId=id;renderMarker();$('markerDialog').showModal();}
  function renderMarker(){const goal=goalById(markerGoalId);if(!goal)return;const flag=flagFor(goal);$('markerColors').innerHTML=PROJECT_COLORS.concat(['#c8524b','#d1a33e','#5c6575']).map(color=>`<button class="color-choice ${flag.color===color?'selected':''}" style="background:${color}" data-flag-color="${color}" aria-label="Use marker color ${color}"></button>`).join('');$('markerShapes').innerHTML=[0,1,2].map(shape=>`<button class="shape-choice ${flag.shape===shape?'selected':''}" data-flag-shape="${shape}" aria-label="Marker shape ${shape+1}"><span class="task-flag flag-${shape}" style="--flag-color:${flag.color}"></span></button>`).join('');}
  function setMarker(color,shape){const goal=goalById(markerGoalId);if(!goal)return;const previous=flagFor(goal);goal.flagColor=color||previous.color;goal.flagShape=shape??previous.shape;recordAction('marker_changed',goal,{color:goal.flagColor,shape:goal.flagShape});persist();refreshTaskViews();renderMarker();}
  function renderCard(goal,depth=0) {
    const color=projectColor(projectFor(goal)),carry=carryoverDays(goal),repeat=!!goal.repeat,value=effectiveProgress(goal),notes=notesFor(goal);
    const ratio=repeat?(value??0)/100:0;
    const activeToday=repeat&&goal.repeat.ticks.includes(dayKey(localToday()));
    return `<article class="goal-card ${carry?'carryover':''} ${repeat?'repeat-task':''} ${repeat&&ratio>.65?'deep-green':''}" style="--project-color:${color};${carryoverStyle(carry)}--repeat-light:${97-ratio*58}%;" draggable="false" data-board-task="${escapeHtml(goal.id)}" data-goal-id="${escapeHtml(goal.id)}" tabindex="0" aria-label="${escapeHtml(goal.title)}" title="${escapeHtml(goal.title)}${carry?` · ${carry}d carryover`:''}"><div class="task-line"><span class="drag-grip" aria-hidden="true" title="Drag to move">⠿</span>${flagButton(goal)}<button type="button" class="card-check ${goal.status==='done'?'is-done':''}" data-complete="${escapeHtml(goal.id)}" aria-label="${repeat?'Tick session:':goal.status==='done'?'Reopen':'Mark done:'} ${escapeHtml(goal.title)}">${repeat?(activeToday?'✓':'○'):goal.status==='done'?'✓':'○'}</button><button class="card-title" data-edit="${escapeHtml(goal.id)}" title="${escapeHtml(goal.title)}">${escapeHtml(goal.title)}</button></div><div class="task-detail-line">${depth?`<span class="subtask-status status-${boardStatus(goal)}" title="Subtask status">${statusInfo(boardStatus(goal)).label}</span>`:''}${progressControl(goal)}<button type="button" class="row-icon add-subtask" data-add-subtask="${escapeHtml(goal.id)}" aria-expanded="${activeSubtaskParent===goal.id}" title="Add a subtask" aria-label="Add subtask to ${escapeHtml(goal.title)}">＋</button>${carry?`<span class="carryover-age">${carry}d</span>`:''}<button class="row-icon reset-progress" data-reset-progress="${escapeHtml(goal.id)}" title="Reset to Not started" aria-label="Reset progress for ${escapeHtml(goal.title)}">↺</button><button class="row-icon" data-quick-notes="${escapeHtml(goal.id)}" title="${notes.length?escapeHtml(notes.map(n=>'• '+n.text).join('\n')):'Add notes'}" aria-label="Notes for ${escapeHtml(goal.title)}">≡${notes.length?`<sup>${notes.length}</sup>`:''}</button><button class="row-icon" data-reschedule="${escapeHtml(goal.id)}" title="Move to another day" aria-label="Reschedule ${escapeHtml(goal.title)}">↗</button><button class="card-delete" data-delete="${escapeHtml(goal.id)}" aria-label="Delete ${escapeHtml(goal.title)}" title="Delete goal">×</button></div></article>`;
  }

  const PLAN_START=new Date(2026,9,20,12);
  const PLAN_END=new Date(2027,9,20,12);
  const addDays=(date,n)=>{const result=new Date(date);result.setDate(result.getDate()+n);return result;};
  function dayKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  const shortDate=date=>date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const reportGoals=()=>plannerState.goals.filter(g=>g.parentId&&goalById(g.parentId)&&(!selectedProject||projectFor(g).id===selectedProject));
  function agendaEntry(goal,date=agendaDay){goal.agenda=goal.agenda||{};return goal.agenda[date]||(goal.agenda[date]={time:'',notes:[]});}
  function scheduledOn(goal,date){return goal.repeat?repeatDates(goal.repeat).includes(date):goal.finishDate?date>=goal.milestoneDate&&date<=goal.finishDate:goal.milestoneDate===date;}
  const planById=id=>(plannerState.schedule||[]).find(p=>p.id===id)||(pendingPlan?.id===id?pendingPlan:null);
  const digitalTime=time=>{const [rawHour,m]=time.split(':').map(Number),h=rawHour%24;return `${String(h%12||12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
  const dayDistance=(from,to)=>Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000);
  function planLastDay(plan){return dayKey(addDays(new Date(plan.date+'T12:00:00'),Math.floor((minutesOf(plan.time)+plan.duration-1)/1440)));}
  function planSegment(plan,date){const offset=dayDistance(plan.date,date)*1440,start=Math.max(0,minutesOf(plan.time)-offset),end=Math.min(1440,minutesOf(plan.time)+plan.duration-offset);return end>start&&end>0&&start<1440?{start,end}:null;}
  function planEnd(plan){const total=minutesOf(plan.time)+plan.duration,days=Math.floor(total/1440);return digitalTime(timeOf(total))+(days?' +'+days+'d':'');}
  function stretchPlanToDay(plan,date,original=plan){const finishMinute=minutesOf(timeOf(minutesOf(original.time)+original.duration))||1440;plan.duration=Math.max(15,Math.min(527040,dayDistance(plan.date,date)*1440+finishMinute-minutesOf(plan.time)));}
  function openPlanDates(id){const plan=planById(id);if(!plan)return;planDateTarget=id;datePurpose='plan-range';dateRangeMode=true;rangeStart='';reschedulingId=null;calendarMonth=new Date(plan.date+'T12:00:00');calendarMonth.setDate(1);$('calendarTitle').textContent='Plan dates';$('rescheduleTaskName').textContent=plan.title||'Draft';$('calendarNote').textContent='Click the first day, then the last day.';$('moveTomorrowBtn').hidden=true;renderCalendar();$('rescheduleDialog').showModal();}
  function planProject(plan){const task=goalById(plan.taskId);return task?projectFor(task):goalById(plan.projectId);}
  function recordPlanEvent(type,plan,details={}){plannerState.events.push({id:generateId(),at:now(),type,planId:plan.id,date:plan.date,taskId:plan.taskId||null,projectId:planProject(plan)?.id||null,...details});}
  function planConnection(plan){
    const task=goalById(plan.taskId),project=planProject(plan);if(!project)return '<span class="unlinked-plan">Uncategorized</span>';
    const nodes=[];let current=task||project,seen=new Set();while(current&&!seen.has(current.id)){seen.add(current.id);nodes.unshift(current);current=goalById(current.parentId);}
    return `<span class="plan-connection" title="${escapeHtml(nodes.map(n=>n.title).join(' › '))}" aria-label="${escapeHtml(nodes.map(n=>n.title).join(' › '))}">${nodes.map((n,i)=>`<span class="connection-node ${i===nodes.length-1?'last':''}" style="--node-color:${projectColor(project)}" tabindex="0" title="${escapeHtml(n.title)}" aria-label="${escapeHtml(n.title)}"></span>`).join('<i></i>')}</span>`;
  }
  function updateScheduleTotal(){
    const date=new Date(agendaDay+'T12:00:00'),monday=dayKey(addDays(date,-((date.getDay()+6)%7))),sunday=dayKey(addDays(new Date(monday+'T12:00:00'),6));
    const plans=(plannerState.schedule||[]).filter(p=>agendaView==='day'?!!planSegment(p,agendaDay):agendaView==='week'?p.date<=sunday&&planLastDay(p)>=monday:agendaView==='month'?p.date.slice(0,7)<=agendaDay.slice(0,7)&&planLastDay(p).slice(0,7)>=agendaDay.slice(0,7):p.date.slice(0,4)<=agendaDay.slice(0,4)&&planLastDay(p).slice(0,4)>=agendaDay.slice(0,4));
    const total=plans.reduce((sum,p)=>sum+p.duration,0),days=Math.floor(total/1440),hours=Math.floor(total%1440/60),minutes=total%60,duration=[days?days+'d':'',hours?hours+'h':'',minutes?minutes+'m':''].filter(Boolean).join(' ');
    $('scheduleTotal').textContent=plans.length?`${plans.length} ${plans.length===1?'plan':'plans'} · ${duration}`:'';
  }
  function commitPendingPlan(plan){
    if(plan!==pendingPlan||!plan.touched||(!plan.title.trim()&&!plan.notes.some(n=>n.text.trim())))return false;
    if(!plan.title.trim())plan.title=plan.notes[0].text.slice(0,160);delete plan.touched;
    (plannerState.schedule??=[]).push(plan);pendingPlan=null;const heading=$('scheduleInspector').querySelector?.('.inspector-heading>span');if(heading)heading.textContent='Edit on calendar';$('libraryMode').textContent='Category for '+plan.title;updateScheduleTotal();recordPlanEvent('plan_created',plan,{plan:{...plan}});persist();return true;
  }
  function dismissPlanEditor(){pendingPlan=null;activeScheduleId=null;renderReport();}
  function createPlan(taskId='',projectId='',allowUntitled=false){
    const window=plannerState.agendaWindow||cleanWindow(),desired=minutesOf(scheduleDraft.time),chosenTime=desired<minutesOf(window.start)||desired>=minutesOf(window.end)?window.start:scheduleDraft.time;
    pendingPlan={id:generateId(),date:agendaDay,title:scheduleDraft.title.trim()||goalById(taskId||scheduleDraft.taskId)?.title||'',time:chosenTime,duration:scheduleDraft.duration,taskId:taskId||scheduleDraft.taskId,projectId:projectId||scheduleDraft.projectId,notes:[],color:taskId||projectId||scheduleDraft.taskId||scheduleDraft.projectId?'':PROJECT_COLORS[(plannerState.schedule?.length||0)%PROJECT_COLORS.length],done:false,touched:false};
    activeScheduleId=pendingPlan.id;renderReport();const input=$('scheduleInspector').querySelector?.('[data-plan-field="title"]');input?.focus();input?.select();return pendingPlan;
  }
  function connectPlan(taskId,projectId='',planId=activeScheduleId){
    const task=goalById(taskId),project=task?projectFor(task):goalById(projectId);if(!task&&!project)return;
    const plan=planById(planId);if(plan){const from={taskId:plan.taskId,projectId:plan.projectId};plan.taskId=task?.id||'';plan.projectId=project.id;if(plan===pendingPlan){plan.touched=true;if(!plan.title&&task)plan.title=task.title;}const wasDraft=plan===pendingPlan;commitPendingPlan(plan);if(!wasDraft)recordPlanEvent('plan_linked',plan,{from,to:{taskId:plan.taskId,projectId:plan.projectId}});if(plan!==pendingPlan)persist();}
    else{showToast('Select a calendar block, then choose its category.');return;}
    renderReport();
  }
  function dropTaskInSchedule(taskId,targetId,minute=null){
    if(targetId==='draft'){connectPlan(taskId,'',null);return;}
    if(targetId==='new'){const task=goalById(taskId);if(!task)return;const previous={...scheduleDraft};scheduleDraft={...scheduleDraft,title:task.title,time:minute===null?scheduleDraft.time:timeOf(Math.min(1425,minute)),taskId,projectId:projectFor(task).id};createPlan(taskId);scheduleDraft={...scheduleDraft,title:previous.title,taskId:previous.taskId,projectId:previous.projectId};renderReport();}
    else connectPlan(taskId,'',targetId);
  }
  function renderReport(){
    const date=new Date(agendaDay+'T12:00:00'),plans=(plannerState.schedule||[]).filter(p=>planSegment(p,agendaDay)).sort((a,b)=>a.time.localeCompare(b.time));
    if(activeScheduleId&&!planSegment(planById(activeScheduleId)||{date:agendaDay,time:'00:00',duration:0},agendaDay)){activeScheduleId=null;pendingPlan=null;}
    $('agendaHeading').innerHTML=`<header class="agenda-header"><div><span class="agenda-eyebrow">${date.toLocaleDateString('en-US',{weekday:'long'})} · ${date.getFullYear()}</span><button type="button" class="agenda-date-title" data-agenda-jump>${agendaView==='year'?date.getFullYear():agendaView==='month'?date.toLocaleDateString('en-US',{month:'long',year:'numeric'}):agendaView==='week'?shortDate(addDays(date,-((date.getDay()+6)%7)))+' – '+shortDate(addDays(date,6-((date.getDay()+6)%7))):date.toLocaleDateString('en-US',{month:'long',day:'numeric'})}<span>⌄</span></button></div><div class="agenda-nav"><div class="agenda-view-switch">${["day","week","month","year"].map(view=>`<button type="button" data-agenda-view="${view}" class="${agendaView===view?"selected":""}" aria-pressed="${agendaView===view}">${view[0].toUpperCase()+view.slice(1)}</button>`).join("")}</div><button type="button" class="secondary-btn" data-agenda-step="-1" aria-label="Previous period">←</button><button type="button" class="secondary-btn" data-agenda-day="${dayKey(localToday())}">Today</button><button type="button" class="secondary-btn" data-agenda-step="1" aria-label="Next period">→</button></div></header>`;
    $('agendaWeek').hidden=agendaView!=='day';
    const monday=addDays(date,-((date.getDay()+6)%7));
    $('agendaWeek').innerHTML=Array.from({length:7},(_,i)=>{const d=addDays(monday,i),key=dayKey(d);return `<button type="button" data-agenda-day="${key}" class="agenda-day ${key===agendaDay?'selected':''} ${key===dayKey(localToday())?'is-today':''}" aria-pressed="${key===agendaDay}"><span>${d.toLocaleDateString('en-US',{weekday:'short'})}</span><b>${d.getDate()}</b></button>`;}).join('');
    updateScheduleTotal();
    $('scheduleContext').textContent=agendaView==='day'?'Make time for your day':'Plan your '+agendaView;
    renderPlanCalendar(plans);
    renderCalendarEditor();renderTaskLibrary();
  }
  function renderCalendarEditor(){
    const selected=planById(activeScheduleId);$('scheduleInspector').hidden=!selected;if(!selected){$('scheduleInspector').innerHTML='';return;}
    $('scheduleInspector').innerHTML=`<div class="inspector-heading"><span>${selected===pendingPlan?'Draft · edit to keep':'Edit on calendar'}</span><button type="button" data-dismiss-plan aria-label="Close block editor">×</button></div><input data-plan-field="title" data-plan="${escapeHtml(selected.id)}" value="${escapeHtml(selected.title)}" placeholder="Title" aria-label="Edit plan activity" maxlength="160"><button type="button" class="block-date-range" data-plan-dates="${escapeHtml(selected.id)}">${shortDate(new Date(selected.date+'T12:00:00'))} → ${shortDate(new Date(planLastDay(selected)+'T12:00:00'))}</button><div class="block-time-fields"><label>From<button type="button" class="quarter-time-field" data-quarter-purpose="plan-start" data-plan="${escapeHtml(selected.id)}" aria-label="Block start time">${digitalTime(selected.time)}</button></label><span>→</span><label>To<button type="button" class="quarter-time-field" data-quarter-purpose="plan-end" data-plan="${escapeHtml(selected.id)}" aria-label="Block finish time">${digitalTime(timeOf(minutesOf(selected.time)+selected.duration))}</button></label></div><div class="block-color-options">${PROJECT_COLORS.map(c=>`<button type="button" style="background:${c}" data-plan-color="${c}" data-plan="${escapeHtml(selected.id)}" aria-label="Block color ${c}"></button>`).join('')}</div><div class="plan-notes">${selected.notes.map(n=>`<div class="agenda-note"><input value="${escapeHtml(n.text)}" data-plan-note-edit="${escapeHtml(n.id)}" data-plan="${escapeHtml(selected.id)}" aria-label="Edit plan note"><button type="button" data-plan-note-remove="${escapeHtml(n.id)}" data-plan="${escapeHtml(selected.id)}" aria-label="Remove plan note">×</button></div>`).join('')}<input data-plan-note="${escapeHtml(selected.id)}" placeholder="＋ Detail, then Enter" aria-label="Add plan detail" maxlength="2000"></div><div class="calendar-editor-footer">${planConnection(selected)}<button type="button" data-plan-unlink="${escapeHtml(selected.id)}">${selected.taskId||selected.projectId?'Disconnect':'Choose tag on the right'}</button><button type="button" data-plan-copy="${escapeHtml(selected.id)}">Copy</button><button type="button" data-plan-remove="${escapeHtml(selected.id)}">Delete</button><button type="button" data-finish-plan>Done</button></div>`;
    positionCalendarEditor();
  }
  function removeCalendarPlan(id){const plan=planById(id);if(!plan)return;if(plan===pendingPlan){dismissPlanEditor();return;}plannerState.schedule=plannerState.schedule.filter(p=>p.id!==plan.id);recordPlanEvent('plan_removed',plan,{plan});persist();renderReport();showToast('Plan removed');const undo=document.createElement('button');undo.type='button';undo.className='toast-undo';undo.textContent='Undo';undo.addEventListener('click',()=>{if(planById(plan.id))return;plannerState.schedule.push(plan);recordPlanEvent('plan_restored',plan);persist();renderReport();showToast('Plan restored');},{once:true});$('toast').appendChild(undo);}
  function copyCalendarPlan(plan){const copy={...plan,id:generateId(),notes:plan.notes.map(n=>({...n,id:generateId()})),done:false};plannerState.schedule.push(copy);recordPlanEvent('plan_copied',copy,{sourceId:plan.id});return copy;}
  function positionCalendarEditor(){
    const main=$('calendarViewport').parentElement?.getBoundingClientRect?.(),block=$('scheduleRows').querySelector?.('[data-calendar-plan="'+activeScheduleId+'"]')?.getBoundingClientRect?.();
    if(main&&block){$('scheduleInspector').style.left=Math.max(6,Math.min(main.width-300,block.right-main.left+12))+'px';$('scheduleInspector').style.top=Math.max(35,Math.min(main.height-260,block.top-main.top+8))+'px';}
  }
  function cleanHourHeight(value){return Math.max(40,Math.min(180,Number(value)||72));}
  function zoomCalendar(event){
    if(!['day','week'].includes(agendaView)||(!event.ctrlKey&&!event.metaKey))return;
    event.preventDefault();
    const old=calendarScale,next=cleanHourHeight(old*Math.exp(-event.deltaY*0.006));
    if(next===old)return;
    const rect=$('calendarLane').getBoundingClientRect(),hours=Math.max(0,(event.clientY-rect.top)/old);
    plannerState.calendarHourHeight=next;renderPlanCalendar();
    window.scrollBy?.(0,hours*(next-old));positionCalendarEditor();persist();
  }
  function openQuarterTime(purpose,planId=null){
    quarterTarget={purpose,planId};const plan=planById(planId),value=purpose==='window-start'?$('scheduleFrom').value:purpose==='window-end'?$('scheduleUntil').value:purpose==='plan-start'?plan.time:timeOf(minutesOf(plan.time)+plan.duration);
    const rounded=Math.round(minutesOf(value)/15)*15,h=Math.floor(rounded/60)%24;quarterHour=h%12||12;quarterMinute=rounded%60;quarterPeriod=h<12?'AM':'PM';
    $('quarterTimeTitle').textContent=purpose.endsWith('end')?'Finish time':'Start time';$('chooseMidnight').hidden=!purpose.endsWith('end');renderQuarterTime();$('quarterTimeDialog').showModal();
  }
  function renderQuarterTime(){
    $('quarterHours').innerHTML=Array.from({length:12},(_,i)=>`<button type="button" data-quarter-hour="${i+1}" class="${quarterHour===i+1?'selected':''}">${i+1}</button>`).join('');
    $('quarterMinutes').innerHTML=[0,15,30,45].map(m=>`<button type="button" data-quarter-minute="${m}" class="${quarterMinute===m?'selected':''}">${String(m).padStart(2,'0')}</button>`).join('');
    document.querySelectorAll('[data-quarter-period]').forEach(b=>b.classList.toggle('selected',b.dataset.quarterPeriod===quarterPeriod));
    $('applyQuarterTime').textContent=`Set ${String(quarterHour).padStart(2,'0')}:${String(quarterMinute).padStart(2,'0')} ${quarterPeriod}`;
    $('quarterTimeHint').textContent=quarterTarget.purpose.endsWith('end')?'12:00 AM means midnight at the end of the day.':'Choose an hour and 00, 15, 30 or 45 minutes.';
  }
  function applyQuarterTime(midnight=false){
    const hour=midnight?0:quarterHour%12+(quarterPeriod==='PM'?12:0),minute=midnight?0:quarterMinute,value=`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,target=quarterTarget;
    if(target.purpose.startsWith('window')){
      const start=target.purpose==='window-start'?value:$('scheduleFrom').value,end=target.purpose==='window-end'?(value==='00:00'?'24:00':value):$('scheduleUntil').value;
      if(minutesOf(end)<=minutesOf(start)){showToast('Choose a finish after the start. Midnight is the end of the day.');return;}
      plannerState.agendaWindow={start,end};persist();renderPlanCalendar();
    }else{
      const plan=planById(target.planId);if(!plan)return;const previous={time:plan.time,duration:plan.duration};
      if(target.purpose==='plan-start')plan.time=value;else{let duration=dayDistance(plan.date,planLastDay(plan))*1440+(value==='00:00'?1440:minutesOf(value))-minutesOf(plan.time);if(duration<=0)duration+=1440;plan.duration=duration;}
      if(plan!==pendingPlan){recordPlanEvent('plan_time_changed',plan,{from:previous,to:{time:plan.time,duration:plan.duration}});persist();}renderReport();
    }
    $('quarterTimeDialog').close();quarterTarget=null;
  }
  function calendarMinute(event){if(!['day','week'].includes(agendaView))return minutesOf(scheduleDraft.time);const lane=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('.time-lane')||$('calendarLane'),rect=lane.getBoundingClientRect(),window=plannerState.agendaWindow||cleanWindow();return Math.max(minutesOf(window.start),Math.min(minutesOf(window.end),minutesOf(window.start)+Math.round((event.clientY-rect.top)/calendarScale*60/15)*15));}
  function gridBlocks(plans,date,start,end){
    const startOf=p=>planSegment(p,date).start,endOf=p=>planSegment(p,date).end;const visible=plans.filter(p=>{const segment=planSegment(p,date);return segment&&segment.start<end&&segment.end>start;}).sort((a,b)=>startOf(a)-startOf(b)),placements=new Map();let group=[],groupEnd=-1;
    function place(){const lanes=[];for(const p of group){let col=lanes.findIndex(last=>last<=startOf(p));if(col<0)col=lanes.length;lanes[col]=endOf(p);placements.set(p.id,{col,count:0});}for(const p of group)placements.get(p.id).count=lanes.length;group=[];}
    for(const p of visible){if(group.length&&startOf(p)>=groupEnd){place();groupEnd=-1;}group.push(p);groupEnd=Math.max(groupEnd,endOf(p));}if(group.length)place();
    return visible.map((plan,index)=>{const project=planProject(plan),color=plan.color||(project?projectColor(project):PROJECT_COLORS[index%PROJECT_COLORS.length]),top=(Math.max(start,startOf(plan))-start)/60*calendarScale,height=(Math.min(end,endOf(plan))-Math.max(start,startOf(plan)))/60*calendarScale,{col,count}=placements.get(plan.id);
      return `<article class="calendar-plan ${activeScheduleId===plan.id||selectedPlans.has(plan.id)?'selected':''} ${plan.done?'is-done':''}" data-calendar-plan="${escapeHtml(plan.id)}" data-schedule-drop="${escapeHtml(plan.id)}" style="--plan-color:${color};top:${top}px;height:${Math.max(16,height)}px;left:calc(${col/count*100}% + 3px);width:calc(${50/count}% - 7px)" title="${escapeHtml(plan.title||'Draft')} · ${digitalTime(plan.time)}–${planEnd(plan)} · ${plan.duration} min" tabindex="0" role="button" aria-label="${escapeHtml(plan.title)}, ${digitalTime(plan.time)} to ${planEnd(plan)}"><div class="calendar-resize top" data-resize-start="${escapeHtml(plan.id)}" title="Drag to adjust start"></div><div class="calendar-plan-line"><span class="calendar-plan-title">${plan.date<date?'← ':''}${escapeHtml(plan.title||'Untitled draft')}${planLastDay(plan)>date?' →':''}</span>${planConnection(plan)}<button type="button" data-plan-complete="${escapeHtml(plan.id)}" aria-label="${plan.done?'Reopen':'Complete'} plan ${escapeHtml(plan.title)}">${plan.done?'✓':'○'}</button><button type="button" data-plan-remove="${escapeHtml(plan.id)}" aria-label="Remove plan ${escapeHtml(plan.title)}">×</button></div>${height>=34?`<span class="calendar-plan-time">${digitalTime(plan.time)} — ${planEnd(plan)}</span>`:''}<span class="calendar-repeat" data-repeat-pull="${escapeHtml(plan.id)}" title="Pull to copy into another time or day">⧉</span><div class="calendar-resize bottom" data-resize-end="${escapeHtml(plan.id)}" title="Drag to adjust finish"></div></article>`;
    }).join('');
  }
  function renderPlanCalendar(){
    const date=new Date(agendaDay+'T12:00:00'),plans=[...(plannerState.schedule||[]),...(pendingPlan?[pendingPlan]:[])],visibleWindow=plannerState.agendaWindow||cleanWindow(),start=minutesOf(visibleWindow.start),end=minutesOf(visibleWindow.end),isGrid=['day','week'].includes(agendaView);
    const viewportTop=$('calendarViewport').getBoundingClientRect?.().top||250,available=Math.max(300,(globalThis.innerHeight||760)-viewportTop-48);calendarScale=cleanHourHeight(plannerState.calendarHourHeight);$('calendarViewport').style.height=(isGrid?(end-start)/60*calendarScale:available)+'px';$('scheduleFrom').value=visibleWindow.start;$('scheduleUntil').value=visibleWindow.end;$('scheduleFrom').textContent=digitalTime(visibleWindow.start);$('scheduleUntil').textContent=visibleWindow.end==='24:00'?'12:00 AM · midnight':digitalTime(visibleWindow.end);$('calendarStage').className='calendar-stage view-'+agendaView;$('calendarStage').style.height=isGrid?(end-start)/60*calendarScale+'px':'100%';$('calendarWindow').hidden=!isGrid;$('calendarWeekHeads').hidden=agendaView!=='week';$('calendarHourLabels').hidden=!isGrid;$('calendarLane').style.background=isGrid?`repeating-linear-gradient(to bottom,transparent 0,transparent ${Math.max(0,calendarScale/4-1)}px,#f0f3eb ${Math.max(0,calendarScale/4-1)}px,#f0f3eb ${calendarScale/4}px),repeating-linear-gradient(to bottom,transparent 0,transparent ${Math.max(0,calendarScale-1)}px,#dce5d2 ${Math.max(0,calendarScale-1)}px,#dce5d2 ${calendarScale}px)`:'none';
    if(isGrid){
      $('calendarHourLabels').innerHTML=Array.from({length:Math.ceil((end-start)/60)+1},(_,i)=>{const minute=start+i*60;return minute>end?'':`<span style="top:${(minute-start)/60*calendarScale}px">${digitalTime(timeOf(minute))}</span>`;}).join('');
      const monday=addDays(date,-((date.getDay()+6)%7)),dates=agendaView==='day'?[agendaDay]:Array.from({length:7},(_,i)=>dayKey(addDays(monday,i)));
      $('calendarWeekHeads').innerHTML='<span></span>'+dates.map(key=>`<button type="button" data-agenda-day="${key}" class="${key===agendaDay?'selected':''}">${new Date(key+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',day:'numeric'})}</button>`).join('');
      $('scheduleRows').className='calendar-blocks '+(agendaView==='week'?'week-lanes':'day-lanes');$('scheduleRows').innerHTML=dates.map(key=>`<div class="time-lane" data-calendar-date="${key}" data-schedule-drop="new">${gridBlocks(plans,key,start,end)}</div>`).join('');
    }else if(agendaView==='month'){
      const first=new Date(date.getFullYear(),date.getMonth(),1,12),monday=addDays(first,-((first.getDay()+6)%7));$('scheduleRows').className='month-calendar';
      $('scheduleRows').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<b>'+d+'</b>').join('')+Array.from({length:42},(_,i)=>{const day=addDays(monday,i),key=dayKey(day),entries=plans.filter(p=>planSegment(p,key)).sort((a,b)=>a.time.localeCompare(b.time));return `<section class="month-cell ${day.getMonth()!==date.getMonth()?'muted':''} ${key===agendaDay?'selected':''}" data-calendar-date="${key}" data-schedule-drop="new"><div><span>${day.getDate()}</span><button type="button" data-calendar-add="${key}" aria-label="Add plan on ${key}">＋</button></div>${entries.map(p=>`<button type="button" class="month-plan" data-calendar-plan="${escapeHtml(p.id)}" style="--plan-color:${p.color||(planProject(p)?projectColor(planProject(p)):'#829c70')}" title="${escapeHtml(p.title)} · ${digitalTime(p.time)}–${planEnd(p)}">${p.date<key?'← ':digitalTime(p.time)+' '}${escapeHtml(p.title)}${planLastDay(p)>key?' →':''}<span class="month-stretch" data-resize-day="${escapeHtml(p.id)}" title="Pull to extend across days">↔</span></button>`).join('')}</section>`;}).join('');
    }else{
      $('scheduleRows').className='year-calendar';$('scheduleRows').innerHTML=Array.from({length:12},(_,month)=>{const first=new Date(date.getFullYear(),month,1,12),offset=(first.getDay()+6)%7,count=new Date(date.getFullYear(),month+1,0).getDate();return `<section class="year-month"><button type="button" data-open-month="${dayKey(first)}">${first.toLocaleDateString('en-US',{month:'long'})}</button><div>${['M','T','W','T','F','S','S'].map(d=>'<small>'+d+'</small>').join('')}${Array.from({length:offset},()=>'<span></span>').join('')}${Array.from({length:count},(_,i)=>{const key=dayKey(addDays(first,i)),entries=plans.filter(p=>planSegment(p,key));return `<button type="button" class="${entries.length?'has-plans':''}" data-calendar-date="${key}" title="${entries.length} plans · ${key}">${i+1}</button>`;}).join('')}</div></section>`;}).join('');
    }
    window.PLANNER_GOOGLE?.render({date:agendaDay,view:agendaView,scale:calendarScale,start,end});
  }
  function renderTaskLibrary(){
    const active=planById(activeScheduleId);$('libraryMode').textContent=active?'Category for '+(active.title||'draft'):'Select a calendar block';
    const projects=plannerState.goals.filter(g=>!g.parentId),query=librarySearch.toLowerCase();
    function branch(goal,depth=0,seen=new Set()){
      if(seen.has(goal.id))return '';const next=new Set(seen);next.add(goal.id);const children=plannerState.goals.filter(g=>g.parentId===goal.id).sort(byPosition);
      const matches=!query||goal.title.toLowerCase().includes(query);const nested=children.map(g=>branch(g,depth+1,next)).join('');if(!matches&&!nested)return '';
      return `${matches?`<button type="button" class="library-task" style="--task-indent:${Math.min(depth,7)*12}px;--project-color:${projectColor(projectFor(goal))}" data-agenda-source="${escapeHtml(goal.id)}" draggable="false" title="${escapeHtml(goal.title)}" aria-label="Connect task ${escapeHtml(goal.title)}"><span class="library-grip">⠿</span><span class="library-task-dot"></span><span>${escapeHtml(goal.title)}</span>${scheduledOn(goal,agendaDay)?'<small>Due</small>':''}</button>`:''}${nested}`;
    }
    $('agendaTaskLibrary').innerHTML=projects.map(project=>{
      const tasks=plannerState.goals.filter(g=>g.parentId===project.id).sort(byPosition).map(g=>branch(g)).join('');if(query&&!tasks&&!project.title.toLowerCase().includes(query))return '';
      return `<section class="library-project"><button type="button" data-schedule-category="${escapeHtml(project.id)}" class="library-project-name" style="--project-color:${projectColor(project)}" title="Categorize with ${escapeHtml(project.title)}"><span class="project-dot"></span>${escapeHtml(project.title)}</button>${tasks}</section>`;
    }).join('')||'<p class="library-empty">No matching tasks. You can still plan your day freely.</p>';
  }
  function openPlanTime(id=null){clockTarget=id?'plan':'draft';clockPlanId=id;const plan=planById(id);showTimeWheels(plan?.title||'New plan',plan?.time||scheduleDraft.time);}
  function showTimeWheels(title,time){const [hour,minute]=time.split(':').map(Number);wheelHour=hour;wheelMinute=minute;$('timeTaskName').textContent=title+' · '+shortDate(new Date(agendaDay+'T12:00:00'));$('hourWheel').innerHTML=Array.from({length:24},(_,h)=>`<button type="button" data-wheel-hour="${h}" aria-label="Hour ${String(h).padStart(2,'0')}">${String(h).padStart(2,'0')}</button>`).join('');$('minuteWheel').innerHTML=[0,15,30,45].map(m=>`<button type="button" data-wheel-minute="${m}" aria-label="Minute ${String(m).padStart(2,'0')}">${String(m).padStart(2,'0')}</button>`).join('');$('clearTaskTime').hidden=clockTarget!=='task';$('timeDialog').showModal();$('hourWheel').scrollTop=hour*44;$('minuteWheel').scrollTop=minute/15*44;updateWheelSelection();}
  function openTaskTime(id){
    clockTarget='task';const goal=goalById(id);if(!goal)return;timeGoalId=id;timeDate=agendaDay;
    const [hour,minute]=(goal.agenda?.[timeDate]?.time||'09:00').split(':').map(Number);wheelHour=hour;wheelMinute=minute;
    $('timeTaskName').textContent=goal.title+' · '+shortDate(new Date(timeDate+'T12:00:00'));
    $('hourWheel').innerHTML=Array.from({length:24},(_,h)=>`<button type="button" data-wheel-hour="${h}" aria-label="Hour ${String(h).padStart(2,'0')}">${String(h).padStart(2,'0')}</button>`).join('');
    $('minuteWheel').innerHTML=[0,15,30,45].map(m=>`<button type="button" data-wheel-minute="${m}" aria-label="Minute ${String(m).padStart(2,'0')}">${String(m).padStart(2,'0')}</button>`).join('');
    $('timeDialog').showModal();$('hourWheel').scrollTop=hour*44;$('minuteWheel').scrollTop=minute/15*44;updateWheelSelection();
  }
  function updateWheelSelection(){document.querySelectorAll('[data-wheel-hour]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.wheelHour)===wheelHour));document.querySelectorAll('[data-wheel-minute]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.wheelMinute)===wheelMinute));$('saveTaskTime').textContent=`Set ${String(wheelHour).padStart(2,'0')}:${String(wheelMinute).padStart(2,'0')}`;}
  function saveTaskTime(clear=false){if(clockTarget!=='task'){const time=`${String(wheelHour).padStart(2,'0')}:${String(wheelMinute).padStart(2,'0')}`;const plan=planById(clockPlanId);if(clockTarget==='plan'&&plan){const previous=plan.time;plan.time=time;recordPlanEvent('plan_time_changed',plan,{from:previous,to:time});persist();}else scheduleDraft.time=time;$('timeDialog').close();renderReport();return;}const goal=goalById(timeGoalId);if(!goal)return;const entry=agendaEntry(goal,timeDate),previous=entry.time;entry.time=clear?'':`${String(wheelHour).padStart(2,'0')}:${String(wheelMinute).padStart(2,'0')}`;goal.updatedAt=now();recordAction('time_changed',goal,{date:timeDate,from:previous,to:entry.time});persist();$('timeDialog').close();renderReport();}
  function refreshTaskViews(){
    const focused=document.activeElement?.dataset;
    const progressFocus=focused?.progress;
    renderBoard();renderReport();if(editingId)renderEditorTree();lastRenderedDay=dayKey(localToday());
    if(progressFocus){
      const root=activeView==='board'?$('board'):$('reportDashboard');
      const control=Array.from(root.querySelectorAll('[data-progress]')).find(button=>button.dataset.progress===progressFocus&&!button.disabled);
      control?.focus({preventScroll:true});
    }
  }
  function render() {$('calendarName').value=cleanCalendarName(plannerState.calendarName);document.title=cleanCalendarName(plannerState.calendarName)+' — Planner';renderNav();
    $('projectNavigation').hidden=activeView==='report';$('newGoalBtn').textContent=activeView==='report'?'＋ New plan':'＋ New task';$('reportDashboard').hidden=activeView!=='report';$('taskControls').hidden=activeView!=='board';$('taskBoard').hidden=activeView!=='board';
    $('bigPictureBtn').classList.toggle('active',activeView==='report');$('taskViewBtn').classList.toggle('active',activeView==='board');refreshTaskViews();
  }
  function navigateTo(horizon) {if(!HORIZONS.some(h=>h.id===horizon))return;currentHorizon=horizon;showAll=false;render();}
  function zoom(delta) {const idx=HORIZONS.findIndex(h=>h.id===currentHorizon);navigateTo(HORIZONS[Math.max(0,Math.min(HORIZONS.length-1,idx+delta))].id);}
  function populateForm(goal) {
    $('fieldTitle').value=goal?.title??'';
    draftNotes=(goal?.notes??String(goal?.description||'').split(/\n/).filter(Boolean).map(text=>({id:generateId(),text,at:null}))).map(n=>({...n}));renderDraftNotes();
    $('fieldScope').value=goal?.milestoneScope??'week';
    $('fieldFinish').value=goal?.finishDate||'';
    $('fieldMilestone').value=goal?.milestoneDate??agendaDay;
    $('fieldParent').value=goal?.parentId??'';
    repeatEnabled=!!goal?.repeat;$('repeatInterval').value=goal?.repeat?.interval??1;$('fieldRepeatUnit').value=goal?.repeat?.unit??'day';$('fieldRepeatEnd').value=goal?.repeat?.end??'';
    $('editorNoteInput').value='';$('deleteGoalBtn').hidden=!goal;$('resetEditorProgress').hidden=!goal;
    activePanelParent=null;renderEditorTree();
    updateScheduleUI();updateConnectionUI();
  }
  function isDescendant(candidateId,ancestorId){let current=goalById(candidateId),n=0;while(current?.parentId && n++<plannerState.goals.length){if(current.parentId===ancestorId)return true;current=goalById(current.parentId);}return false;}
  function hasDependencyPath(fromId,targetId){let current=goalById(fromId),n=0;while(current?.rule?.sourceId&&n++<plannerState.goals.length){if(current.rule.sourceId===targetId)return true;current=goalById(current.rule.sourceId);}return false;}
  function openEditor(id=null,status=null,asProject=false,parentId=null) {
    creatingProject=asProject;
    tagDirectoryId=null;showAllTags=false;
    editingId=id;
    const goal=id?goalById(id):null;
    const isProject=asProject||!!(goal&&!goal.parentId);
    $('drawerTitle').textContent=isProject?(goal?'Edit project':'New project'):(goal?'Edit task':'New task');
    $('connectionField').hidden=isProject;
    $('milestoneField').hidden=isProject;
    populateForm(goal);
    if(!goal&&!asProject)$('fieldParent').value=parentId||selectedProject||plannerState.goals.find(g=>!g.parentId)?.id||'';
    if(parentId&&!goal){const parent=goalById(parentId);$('drawerTitle').textContent='New subtask';$('fieldMilestone').value=parent?.milestoneDate||'';updateScheduleUI();}
    updateConnectionUI();
    $('goalForm').dataset.newStatus=status||'todo';
    $('editorDrawer').classList.add('open');$('editorDrawer').setAttribute('aria-hidden','false');$('drawerOverlay').hidden=false;
    setTimeout(()=>$('fieldTitle').focus(),60);
  }
  function closeEditor(){ $('editorDrawer').classList.remove('open');$('editorDrawer').setAttribute('aria-hidden','true');$('drawerOverlay').hidden=true; editingId=null; }
  function saveForm(event,keepOpen=false){
    event.preventDefault();const title=$('fieldTitle').value.trim();if(!title)return;
    const old=editingId?goalById(editingId):null;
    const isProject=creatingProject||!!(old&&!old.parentId);
    if(!isProject&&!$('fieldMilestone').value)$('fieldMilestone').value=agendaDay;
    if(!isProject&&!$('fieldParent').value){showToast('Choose a project or larger goal for this task.');return;}
    if(!isProject&&!repeatEnabled&&$('fieldFinish').value&&(!$('fieldMilestone').value||$('fieldFinish').value<$('fieldMilestone').value)){showToast('Finish must be on or after the start date.');return;}
    addDraftInput();
    const repeat=readRepeatDraft();if(repeatEnabled&&!isProject&&!repeat){showToast('Choose a start date, an end date, and a valid repeat interval.');return;}
    if(old?.repeat&&repeat){const bases=repeatDates({...repeat,moves:{}});repeat.moves=Object.fromEntries(Object.entries(old.repeat.moves||{}).filter(([base])=>bases.includes(base)));repeat.ticks=old.repeat.ticks.filter(date=>repeatDates(repeat).includes(date));}
    const update={title,notes:draftNotes.map(n=>({...n})),repeat:isProject?null:repeat,description:draftNotes.map(n=>n.text).join('\n'),horizon:old?.horizon??currentHorizon,status:old?.status??$('goalForm').dataset.newStatus,due:old?.due??'',milestoneScope:$('fieldScope').value,milestoneDate:isProject?'':$('fieldMilestone').value,finishDate:isProject||repeatEnabled?'':$('fieldFinish').value,checkins:old?.checkins??[],parentId:isProject?'':$('fieldParent').value,rule:null,updatedAt:now()};
    if(old){
      if((old.finishDate||'')!==update.finishDate)recordAction('date_range_changed',old,{from:{start:old.milestoneDate,finish:old.finishDate||null},to:{start:update.milestoneDate,finish:update.finishDate||null}});
      if(JSON.stringify(old.repeat||null)!==JSON.stringify(update.repeat))recordAction('repeat_changed',old,{from:old.repeat||null,to:update.repeat});
      if(JSON.stringify(old.notes||[])!==JSON.stringify(update.notes))recordAction('notes_updated',old,{notes:update.notes});
      if((old.milestoneDate||'')!==update.milestoneDate){old.originalScheduledScope=old.originalScheduledScope||old.milestoneScope||update.milestoneScope;old.originalScheduledDate=old.originalScheduledDate||old.milestoneDate||update.milestoneDate;recordAction(!update.milestoneDate?'unscheduled':old.milestoneDate?'rescheduled':'scheduled',old,{from:old.milestoneDate||null,to:update.milestoneDate||null,progress:effectiveProgress(old),status:old.status,source:'editor'});}
      if(old.title!==title||old.description!==update.description||old.parentId!==update.parentId||old.milestoneScope!==update.milestoneScope)recordAction('edited',old,{from:{title:old.title,description:old.description,parentId:old.parentId,scope:old.milestoneScope},to:{title,description:update.description,parentId:update.parentId,scope:update.milestoneScope}});
      if(old.autoFrom){old.autoFrom=null;}Object.assign(old,update);if(old.repeat)syncRepeatStatus(old);}else{const id=generateId();const goal=sanitizeGoal({...update,id,position:Math.max(-1,...plannerState.goals.filter(g=>boardStatus(g)===update.status).map(g=>g.position??0))+1,originalScheduledScope:update.milestoneScope,progress:null,originalScheduledDate:update.milestoneDate||'',completedAt:update.status==='done'?now():null,autoFrom:null,createdAt:now()});plannerState.goals.push(goal);if(goal.repeat)syncRepeatStatus(goal);recordAction('created',goal,{scheduledDate:goal.milestoneDate||null,status:goal.status,description:goal.description,parentId:goal.parentId});if(isProject)selectedProject=id;}
    persist();
    if(keepOpen){const saved=old||plannerState.goals[plannerState.goals.length-1];editingId=saved.id;creatingProject=false;$('drawerTitle').textContent=isProject?'Edit project':'Edit task';$('deleteGoalBtn').hidden=false;$('resetEditorProgress').hidden=false;activePanelParent=saved.id;render();updateConnectionUI();renderEditorTree();return saved.id;}
    closeEditor();render();showToast(isProject?'Project updated':'Task updated');
  }
  function deleteGoal(id=editingId){
    const goal=goalById(id);if(!goal)return;
    const index=plannerState.goals.indexOf(goal);
    recordAction('deleted',goal,{scheduledDate:goal.milestoneDate||null,progress:effectiveProgress(goal),status:goal.status,description:goal.description,parentId:goal.parentId});
    const links=plannerState.goals.filter(g=>g.parentId===id||g.rule?.sourceId===id).map(g=>({id:g.id,parentId:g.parentId,rule:g.rule}));
    plannerState.goals=plannerState.goals.filter(g=>g.id!==id);
    for(const other of plannerState.goals){if(other.parentId===id)other.parentId='';if(other.rule?.sourceId===id)other.rule=null;}
    persist();if(editingId===id)closeEditor();render();showToast('Goal deleted');
    const undo=document.createElement('button');undo.type='button';undo.className='toast-undo';undo.textContent='Undo';
    undo.addEventListener('click',()=>{
      if(goalById(id))return;
      plannerState.goals.splice(Math.min(index,plannerState.goals.length),0,goal);
      for(const link of links){const other=goalById(link.id);if(!other)continue;if(link.parentId===id&&!other.parentId)other.parentId=id;if(link.rule?.sourceId===id&&!other.rule)other.rule=link.rule;}
      recordAction('restored',goal);persist();render();showToast('Goal restored');
    },{once:true});
    $('toast').appendChild(undo);clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),8000);
  }
  function exportBackup() {
    const backup={...plannerState,exportedAt:now()};
    const file=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(file);const anchor=document.createElement('a');anchor.href=url;anchor.download=`orbit-planner-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Backup downloaded');
  }
  async function importBackup(file){
    if(!file)return;
    try {
      const imported=JSON.parse(await file.text());
      if(imported?.version!==1||!Array.isArray(imported.goals))throw Error('Unsupported JSON backup');
      if(imported.goals.length>20000)throw Error('Too many goals in backup');
      const cleaned=imported.goals.map(sanitizeGoal);
      if(cleaned.some(g=>!g.title.trim())||new Set(cleaned.map(g=>g.id)).size!==cleaned.length)throw Error('Invalid or duplicate goals');
      if(!confirm(`Replace your current ${plannerState.goals.length} goals with ${cleaned.length} goals from this backup? Export your current goals first if you need them.`))return;
      plannerState={version:1,goals:cleaned,events:readEvents(imported.events),dayNotes:cleanDayNotes(imported.dayNotes),schedule:cleanSchedule(imported.schedule,cleaned),agendaWindow:cleanWindow(imported.agendaWindow),calendarName:cleanCalendarName(imported.calendarName),calendarHourHeight:cleanHourHeight(imported.calendarHourHeight)};storageWritable=true;persist();render();showToast('Backup restored');
    }catch(error){alert(`Could not import backup: ${error.message}`);}finally{$('fileInput').value='';}
  }
  function attachEvents(){
    document.addEventListener('click',event=>{
      if(Date.now()<suppressPullClickUntil){event.preventDefault();return;}
      const fullDay=event.target.closest('[data-show-full-day]');if(fullDay){plannerState.agendaWindow={start:'00:00',end:'24:00'};persist();renderPlanCalendar();return;}
      const planDates=event.target.closest('[data-plan-dates]');if(planDates){openPlanDates(planDates.dataset.planDates);return;}
      const quarter=event.target.closest('[data-quarter-purpose]');if(quarter){openQuarterTime(quarter.dataset.quarterPurpose,quarter.dataset.plan);return;}
      const qHour=event.target.closest('[data-quarter-hour]');if(qHour){quarterHour=Number(qHour.dataset.quarterHour);renderQuarterTime();return;}
      const qMinute=event.target.closest('[data-quarter-minute]');if(qMinute){quarterMinute=Number(qMinute.dataset.quarterMinute);renderQuarterTime();return;}
      const qPeriod=event.target.closest('[data-quarter-period]');if(qPeriod){quarterPeriod=qPeriod.dataset.quarterPeriod;renderQuarterTime();return;}
      if(event.target.closest('[data-dismiss-plan]')){dismissPlanEditor();return;}
      if(event.target.closest('[data-finish-plan]')){const plan=planById(activeScheduleId);if(plan===pendingPlan&&plan){plan.touched=true;commitPendingPlan(plan);}dismissPlanEditor();return;}
      if(activeScheduleId&&!event.target.closest('#newGoalBtn,#quarterTimeDialog,#rescheduleDialog')&&!event.target.closest('.calendar-editor,[data-calendar-plan],.task-library,[data-plan-field],[data-plan-note]')){pendingPlan=null;activeScheduleId=null;renderReport();}
      const view=event.target.closest('[data-agenda-view]');if(view){agendaView=view.dataset.agendaView;renderReport();return;}
      const step=event.target.closest('[data-agenda-step]');if(step){const delta=Number(step.dataset.agendaStep),date=new Date(agendaDay+'T12:00:00');if(agendaView==='day'||agendaView==='week')date.setDate(date.getDate()+delta*(agendaView==='week'?7:1));else if(agendaView==='month'){date.setDate(1);date.setMonth(date.getMonth()+delta);}else date.setFullYear(date.getFullYear()+delta);agendaDay=dayKey(date);activeScheduleId=null;renderReport();return;}
      const month=event.target.closest('[data-open-month]');if(month){agendaDay=month.dataset.openMonth;agendaView='month';renderReport();return;}
      const addCalendar=event.target.closest('[data-calendar-add]');if(addCalendar){agendaDay=addCalendar.dataset.calendarAdd;scheduleDraft.title='';createPlan('','',true);return;}
      const dayCell=event.target.closest('[data-calendar-date]');if(dayCell&&['month','year'].includes(agendaView)&&!event.target.closest('[data-calendar-plan]')){agendaDay=dayCell.dataset.calendarDate;if(agendaView==='year')agendaView='day';activeScheduleId=null;renderReport();return;}
      const planColor=event.target.closest('[data-plan-color]');if(planColor){const plan=planById(planColor.dataset.plan);plan.color=planColor.dataset.planColor;if(plan===pendingPlan){renderPlanCalendar();return;}recordPlanEvent('plan_color_changed',plan,{color:plan.color});persist();renderPlanCalendar();return;}
      const calendarPlan=event.target.closest('[data-calendar-plan]');if(calendarPlan&&(!event.target.closest('button')||event.target===calendarPlan)){if(pendingPlan&&pendingPlan.id!==calendarPlan.dataset.calendarPlan)pendingPlan=null;const id=calendarPlan.dataset.calendarPlan;if(event.ctrlKey||event.metaKey||event.shiftKey){if(selectedPlans.has(id))selectedPlans.delete(id);else selectedPlans.add(id);}else{selectedPlans.clear();selectedPlans.add(id);}activeScheduleId=null;$('scheduleInspector').hidden=true;$('scheduleRows').querySelectorAll('[data-calendar-plan]').forEach(el=>el.classList.toggle('selected',selectedPlans.has(el.dataset.calendarPlan)));return;}
      const sourceTask=event.target.closest('[data-agenda-source]');if(sourceTask){connectPlan(sourceTask.dataset.agendaSource);return;}
      const category=event.target.closest('[data-schedule-category]');if(category){connectPlan('',category.dataset.scheduleCategory);return;}
      const expand=event.target.closest('[data-plan-expand]');if(expand){activeScheduleId=activeScheduleId===expand.dataset.planExpand?null:expand.dataset.planExpand;renderReport();return;}
      const clock=event.target.closest('[data-plan-clock]');if(clock){openPlanTime(clock.dataset.planClock);return;}
      const completePlan=event.target.closest('[data-plan-complete]');if(completePlan){const plan=planById(completePlan.dataset.planComplete);if(plan===pendingPlan)return;plan.done=!plan.done;recordPlanEvent('plan_toggled',plan,{done:plan.done});persist();renderReport();return;}
      const removePlan=event.target.closest('[data-plan-remove]');if(removePlan){removeCalendarPlan(removePlan.dataset.planRemove);return;}
      const copyPlan=event.target.closest('[data-plan-copy]');if(copyPlan){const plan=planById(copyPlan.dataset.planCopy);if(plan&&plan!==pendingPlan){selectedPlans.clear();activeScheduleId=copyCalendarPlan(plan).id;persist();renderReport();}return;}
      const unlink=event.target.closest('[data-plan-unlink]');if(unlink){const plan=planById(unlink.dataset.planUnlink);plan.taskId='';plan.projectId='';if(plan!==pendingPlan){recordPlanEvent('plan_unlinked',plan);persist();}renderReport();return;}
      if(event.target.closest('[data-unlink-draft]')){scheduleDraft.taskId='';scheduleDraft.projectId='';renderReport();return;}
      const removePlanNote=event.target.closest('[data-plan-note-remove]');if(removePlanNote){const plan=planById(removePlanNote.dataset.plan);plan.notes=plan.notes.filter(n=>n.id!==removePlanNote.dataset.planNoteRemove);recordPlanEvent('plan_note_removed',plan);persist();renderReport();return;}
      const mode=event.target.closest('[data-date-mode]');if(mode){dateRangeMode=mode.dataset.dateMode==='range';rangeStart='';$('calendarNote').textContent=dateRangeMode?'Click a start date, then a finish date.':'Click a finish date.';renderCalendar();return;}
      const agendaDate=event.target.closest('[data-agenda-day]');if(agendaDate){agendaDay=agendaDate.dataset.agendaDay;activeScheduleId=null;renderReport();return;}
      if(event.target.closest('[data-agenda-jump]')){datePurpose='agenda';reschedulingId=null;calendarMonth=new Date(agendaDay+'T12:00:00');calendarMonth.setDate(1);$('calendarTitle').textContent='Go to a day';$('rescheduleTaskName').textContent='Your agenda';$('calendarNote').textContent='Choose a day to open its agenda.';$('moveTomorrowBtn').hidden=true;renderCalendar();$('rescheduleDialog').showModal();return;}
      if(event.target.closest('[data-agenda-add]')){openEditor();$('fieldMilestone').value=agendaDay;updateScheduleUI();return;}
      const time=event.target.closest('[data-agenda-time]');if(time){openTaskTime(time.dataset.agendaTime);return;}
      const hour=event.target.closest('[data-wheel-hour]');if(hour){wheelHour=Number(hour.dataset.wheelHour);$('hourWheel').scrollTop=wheelHour*44;updateWheelSelection();return;}
      const minute=event.target.closest('[data-wheel-minute]');if(minute){wheelMinute=Number(minute.dataset.wheelMinute);$('minuteWheel').scrollTop=wheelMinute/15*44;updateWheelSelection();return;}
      const include=event.target.closest('[data-agenda-include]');if(include){const goal=goalById(include.dataset.agendaInclude);agendaEntry(goal);recordAction('added_to_day',goal,{date:agendaDay});persist();renderReport();return;}
      const checked=event.target.closest('[data-agenda-check]');if(checked){const goal=goalById(checked.dataset.agendaCheck);if(goal.repeat)toggleRepeatTick(goal.id,agendaDay);else setGoalStatus(goal.id,goal.status==='done'?'todo':'done');return;}
      const removeDay=event.target.closest('[data-delete-day-note]');if(removeDay){plannerState.dayNotes[agendaDay]=(plannerState.dayNotes[agendaDay]||[]).filter(n=>n.id!==removeDay.dataset.deleteDayNote);plannerState.events.push({type:'day_note_removed',at:now(),date:agendaDay,noteId:removeDay.dataset.deleteDayNote});persist();renderReport();return;}
      const removeTask=event.target.closest('[data-delete-agenda-note]');if(removeTask){const goal=goalById(removeTask.dataset.noteTask),entry=agendaEntry(goal);entry.notes=entry.notes.filter(n=>n.id!==removeTask.dataset.deleteAgendaNote);recordAction('day_task_note_removed',goal,{date:agendaDay,noteId:removeTask.dataset.deleteAgendaNote});persist();renderReport();return;}
      const directory=event.target.closest('[data-directory]');if(directory){inspectDirectory(directory.dataset.directory);return;}
      const addPanel=event.target.closest('[data-add-panel-child]');if(addPanel){activePanelParent=activePanelParent===addPanel.dataset.addPanelChild?null:addPanel.dataset.addPanelChild;renderEditorTree();focusPanelInput();return;}
      const addChild=event.target.closest('[data-add-subtask]');if(addChild){activeSubtaskParent=activeSubtaskParent===addChild.dataset.addSubtask?null:addChild.dataset.addSubtask;renderBoard();focusSubtaskInput();return;}
      if(event.target.closest('[data-cancel-subtask]')){activeSubtaskParent=null;renderBoard();return;}
      const closer=event.target.closest('[data-close-dialog]');if(closer){$(closer.dataset.closeDialog).close();return;}
      const reset=event.target.closest('[data-reset-progress]');if(reset){resetProgress(reset.dataset.resetProgress);return;}
      const tracker=event.target.closest('[data-repeat-tracker]');if(tracker){openRepeatTracker(tracker.dataset.repeatTracker);return;}
      const tick=event.target.closest('[data-repeat-tick]');if(tick){toggleRepeatTick(tick.dataset.repeatTick,tick.dataset.sessionDate);return;}
      const flag=event.target.closest('[data-marker]');if(flag){openMarker(flag.dataset.marker);return;}
      const color=event.target.closest('[data-flag-color]');if(color){setMarker(color.dataset.flagColor,null);return;}
      const shape=event.target.closest('[data-flag-shape]');if(shape){setMarker(null,Number(shape.dataset.flagShape));return;}
      const quickNote=event.target.closest('[data-quick-notes]');if(quickNote){openQuickNotes(quickNote.dataset.quickNotes);return;}
      const deleteNote=event.target.closest('[data-remove-note]');if(deleteNote){removeNote(deleteNote.dataset.removeNote,deleteNote.dataset.notesContext);return;}
      const unit=event.target.closest('[data-repeat-unit]');if(unit){$('fieldRepeatUnit').value=unit.dataset.repeatUnit;updateScheduleUI();return;}
      const progress=event.target.closest('[data-progress]');if(progress){advanceProgress(progress.dataset.progress);return;}
      const move=event.target.closest('[data-reschedule]');if(move){openReschedule(move.dataset.reschedule);return;}
      const day=event.target.closest('[data-move-date]');if(day){selectCalendarDate(day.dataset.moveDate);return;}

      const scope=event.target.closest('[data-scope]');if(scope){$('fieldScope').value=scope.dataset.scope;document.querySelectorAll('[data-scope]').forEach(button=>button.classList.toggle('selected',button===scope));return;}
      const checkin=event.target.closest('[data-checkin]');if(checkin){const goal=goalById(checkin.dataset.checkin);if(!goal)return;const date=checkin.dataset.date;if(goal.repeat){toggleRepeatTick(goal.id,date);return;}goal.checkins=goal.checkins??[];goal.checkins=goal.checkins.includes(date)?goal.checkins.filter(d=>d!==date):[...goal.checkins,date];goal.updatedAt=now();recordAction('activity_toggled',goal,{date,active:goal.checkins.includes(date)});persist();renderReport();return;}
      const addMilestone=event.target.closest('[data-add-milestone]');if(addMilestone){openEditor();return;}
      const reportStatus=event.target.closest('[data-report-status]');if(reportStatus){setGoalStatus(reportStatus.dataset.goal,reportStatus.dataset.reportStatus);return;}
      const remove=event.target.closest('[data-delete]');if(remove){deleteGoal(remove.dataset.delete);return;}
      const complete=event.target.closest('[data-complete]');if(complete){const goal=goalById(complete.dataset.complete);if(goal.repeat){const today=dayKey(localToday());if(repeatDates(goal.repeat).includes(today))toggleRepeatTick(goal.id,today);else openRepeatTracker(goal.id);return;}setGoalStatus(goal.id,goal.status==='done'?(goal.progress>0?'progress':'todo'):'done');return;}
      const project=event.target.closest('[data-project]');if(project){selectedProject=project.dataset.project;render();return;}
      const add=event.target.closest('[data-add-status]');if(add){openEditor(null,add.dataset.addStatus);return;}
      const edit=event.target.closest('[data-edit]');if(edit){openEditor(edit.dataset.edit);return;}
      const card=event.target.closest('[data-goal-id]');if(card){openEditor(card.dataset.goalId);return;}
    });
    document.addEventListener('keydown',event=>{const dayInput=event.target.closest('[data-day-note]'),taskInput=event.target.closest('[data-agenda-note]');if(!dayInput&&!taskInput)return;if(event.key!=='Enter')return;event.preventDefault();const input=dayInput||taskInput,text=input.value.trim();if(!text)return;const note={id:generateId(),text};if(dayInput){plannerState.dayNotes=plannerState.dayNotes||{};(plannerState.dayNotes[agendaDay]??=[]).push(note);plannerState.events.push({type:'day_note_added',at:now(),date:agendaDay,note});}else{const goal=goalById(taskInput.dataset.agendaNote);agendaEntry(goal).notes.push(note);recordAction('day_task_note_added',goal,{date:agendaDay,note});}input.value='';persist();renderReport();const selector=dayInput?'[data-day-note]':'[data-agenda-note="'+taskInput.dataset.agendaNote+'"]';$('reportDashboard').querySelector?.(selector)?.focus();});
    document.addEventListener('keydown',event=>{const draftInput=event.target.closest('[data-new-draft-subtask]');if(draftInput){if(event.key==='Enter'){event.preventDefault();const title=draftInput.value.trim();if(!title)return;if(!$('fieldTitle').value.trim()){showToast('Give the main task a title first.');$('fieldTitle').focus();return;}const parentId=saveForm({preventDefault(){}},true);if(parentId)addInlineSubtask(parentId,title,'panel');}return;}const panelInput=event.target.closest('[data-new-panel-subtask]');if(panelInput){if(event.key==='Enter'){event.preventDefault();addInlineSubtask(panelInput.dataset.newPanelSubtask,panelInput.value,'panel');}else if(event.key==='Escape'){activePanelParent=null;renderEditorTree();}return;}const input=event.target.closest('[data-new-subtask]');if(!input)return;if(event.key==='Enter'){event.preventDefault();addInlineSubtask(input.dataset.newSubtask,input.value);}else if(event.key==='Escape'){activeSubtaskParent=null;renderBoard();}});
    $('board').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.classList.contains('goal-card')){event.preventDefault();openEditor(event.target.dataset.goalId);}});
    function clearPullMarks(){document.querySelectorAll('.dragover,.drop-before,.drop-after,.drop-nest').forEach(el=>el.classList.remove('dragover','drop-before','drop-after','drop-nest'));}
    function pullTarget(event){
      const hit=document.elementFromPoint(event.clientX,event.clientY);
      const schedule=hit?.closest('[data-schedule-drop]');if(schedule?.dataset.scheduleDrop!==undefined)return {element:schedule,mode:'zone',scheduleId:schedule.dataset.scheduleDrop};
      const row=hit?.closest('[data-panel-task],[data-board-task]');
      if(row){const bounds=row.getBoundingClientRect(),fraction=(event.clientY-bounds.top)/bounds.height;return {element:row,id:row.dataset.panelTask||row.dataset.boardTask,mode:fraction<.28?'before':fraction>.72?'after':'nest'};}
      const element=hit?.closest('[data-parent-drop],[data-child-drop],[data-drop-tomorrow],[data-drop-calendar],[data-status]');
      return element?{element,mode:'zone'}:null;
    }
    document.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;const source=event.target.closest('[data-agenda-source]')||event.target.closest('[data-pull-task],[data-panel-task],[data-board-task]');if(!source)return;
      if(event.target.closest('input,textarea,[data-add-panel-child],.row-icon,.card-check,.card-delete,.flag-button,.mini-progress'))return;
      pointerPull={id:source.dataset.agendaSource||source.dataset.pullTask||source.dataset.panelTask||source.dataset.boardTask,source,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,active:false};
    });
    document.addEventListener('pointermove',event=>{
      if(!pointerPull||event.pointerId!==pointerPull.pointerId)return;
      if(!pointerPull.active&&Math.hypot(event.clientX-pointerPull.startX,event.clientY-pointerPull.startY)<6)return;
      pointerPull.active=true;event.preventDefault();pointerPull.source.classList.add('pulling');
      if(pointerPull.source.dataset.boardTask)$('rescheduleDock').hidden=false;
      clearPullMarks();const target=pullTarget(event);if(target&&target.id!==pointerPull.id)target.element.classList.add(target.mode==='zone'?'dragover':'drop-'+target.mode);
    },{passive:false});
    document.addEventListener('pointerup',event=>{
      if(!pointerPull||event.pointerId!==pointerPull.pointerId)return;const pull=pointerPull;pointerPull=null;
      const target=pull.active?pullTarget(event):null;
      pull.source.classList.remove('pulling');clearPullMarks();$('rescheduleDock').hidden=true;
      if(!pull.active)return;suppressPullClickUntil=Date.now()+400;
      if(!target)return;
      if(target.scheduleId){if(target.element.dataset.calendarDate)agendaDay=target.element.dataset.calendarDate;dropTaskInSchedule(pull.id,target.scheduleId,target.scheduleId==='new'?calendarMinute(event):null);return;}
      if(pull.source.dataset.agendaSource)return;
      if(target.id){if(target.mode==='nest')connectTask(pull.id,target.id);else placeTaskBeside(pull.id,target.id,target.mode==='after');return;}
      const el=target.element;
      if(el.hasAttribute('data-parent-drop'))setEditorParent(pull.id);
      else if(el.dataset.childDrop)connectTask(pull.id,el.dataset.childDrop);
      else if(el.hasAttribute('data-drop-tomorrow'))rescheduleGoal(pull.id,dayKey(addDays(localToday(),1)));
      else if(el.hasAttribute('data-drop-calendar'))openReschedule(pull.id);
      else if(el.dataset.status)moveTask(pull.id,el.dataset.status);
    });
    document.addEventListener('pointercancel',()=>{pointerPull?.source.classList.remove('pulling');pointerPull=null;clearPullMarks();$('rescheduleDock').hidden=true;});
    document.addEventListener('dragstart',event=>{
      const pulled=event.target.closest('[data-pull-task],[data-panel-task]');if(pulled){pullingTaskId=pulled.dataset.pullTask||pulled.dataset.panelTask;draggingId=null;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',pullingTaskId);return;}
      const card=event.target.closest('[data-goal-id]');if(!card)return;
      draggingId=card.dataset.goalId;card.classList.add('dragging');$('rescheduleDock').hidden=false;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggingId);
    });
    function endDrag(){draggingId=null;pullingTaskId=null;$('rescheduleDock').hidden=true;document.querySelectorAll('.dragover,.dragging,.drop-before,.drop-after,.drop-nest').forEach(el=>el.classList.remove('dragover','dragging','drop-before','drop-after','drop-nest'));}
    document.addEventListener('dragend',endDrag);
    document.addEventListener('dragover',event=>{
      const connection=event.target.closest('[data-parent-drop],[data-child-drop]');if(connection&&(pullingTaskId||draggingId)){event.preventDefault();document.querySelectorAll('.dragover').forEach(el=>el.classList.remove('dragover'));connection.classList.add('dragover');return;}
      const target=event.target.closest('[data-drop-tomorrow],[data-drop-calendar],[data-status]');if(!target||!draggingId)return;
      event.preventDefault();document.querySelectorAll('.dragover,.drop-before,.drop-after,.drop-nest').forEach(el=>el.classList.remove('dragover','drop-before','drop-after','drop-nest'));target.classList.add('dragover');
      const card=event.target.closest('.goal-card');
      if(card&&card.dataset.goalId!==draggingId){const bounds=card.getBoundingClientRect(),fraction=(event.clientY-bounds.top)/bounds.height;card.classList.add(fraction>.28&&fraction<.72?'drop-nest':fraction>=.72?'drop-after':'drop-before');}
    });
    document.addEventListener('drop',event=>{
      const connection=event.target.closest('[data-parent-drop],[data-child-drop]');if(connection&&(pullingTaskId||draggingId)){event.preventDefault();const id=pullingTaskId||draggingId;endDrag();if(connection.hasAttribute('data-parent-drop'))setEditorParent(id);else connectTask(id,connection.dataset.childDrop);return;}
      const target=event.target.closest('[data-drop-tomorrow],[data-drop-calendar],[data-status]');if(!target||!draggingId)return;
      event.preventDefault();const id=draggingId;
      const card=event.target.closest('.goal-card');const bounds=card?.getBoundingClientRect();const after=bounds?event.clientY>bounds.top+bounds.height/2:false;const fraction=bounds?(event.clientY-bounds.top)/bounds.height:0;const nest=card&&fraction>.28&&fraction<.72;
      endDrag();
      if(target.hasAttribute('data-drop-tomorrow'))rescheduleGoal(id,dayKey(addDays(localToday(),1)));
      else if(target.hasAttribute('data-drop-calendar'))openReschedule(id);
      else if(nest)connectTask(id,card.dataset.goalId);
      else moveTask(id,target.dataset.status,card?.dataset.goalId??null,after);
    });
    $('applyQuarterTime').addEventListener('click',()=>applyQuarterTime());$('chooseMidnight').addEventListener('click',()=>applyQuarterTime(true));
    $('calendarName').addEventListener('input',event=>{if(!event.target.value.trim())return;plannerState.calendarName=cleanCalendarName(event.target.value);document.title=plannerState.calendarName+' — Planner';persist();});
    $('calendarName').addEventListener('change',()=>{$('calendarName').value=cleanCalendarName(plannerState.calendarName);});
    function setCalendarWindow(){const start=$('scheduleFrom').value,end=$('scheduleUntil').value==='00:00'?'24:00':$('scheduleUntil').value;if(!start||!end||minutesOf(end)<=minutesOf(start)){showToast('Finish the visible hours after the start.');return;}plannerState.agendaWindow={start,end};persist();renderPlanCalendar();}
    $('scheduleFrom').addEventListener('change',setCalendarWindow);$('scheduleUntil').addEventListener('change',setCalendarWindow);$('scheduleFrom').addEventListener('input',()=>{if($('scheduleFrom').value&&$('scheduleUntil').value&&minutesOf($('scheduleUntil').value)>minutesOf($('scheduleFrom').value))setCalendarWindow();});$('scheduleUntil').addEventListener('input',()=>{if($('scheduleFrom').value&&$('scheduleUntil').value&&minutesOf($('scheduleUntil').value)>minutesOf($('scheduleFrom').value))setCalendarWindow();});
    document.addEventListener('pointerdown',event=>{
      if(activeScheduleId&&!event.target.closest('.calendar-editor,[data-calendar-plan],.task-library,#quarterTimeDialog,#rescheduleDialog,#newGoalBtn'))dismissPlanEditor();
      const dayHandle=event.target.closest('[data-resize-day]');if(dayHandle&&event.button===0){const plan=planById(dayHandle.dataset.resizeDay);calendarGesture={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,anchor:0,mode:'days',planId:plan.id,original:{time:plan.time,duration:plan.duration,date:plan.date},active:false};event.preventDefault();return;}
      if(!['day','week'].includes(agendaView)||event.button!==0||!event.target.closest('#calendarLane')||event.target.closest('button,input,.calendar-editor,[data-agenda-source]'))return;
      const block=event.target.closest('[data-calendar-plan]');if(activeScheduleId&&!block&&!event.target.closest('.calendar-editor'))dismissPlanEditor();if(pendingPlan&&pendingPlan.id!==block?.dataset.calendarPlan){pendingPlan=null;activeScheduleId=null;}const plan=planById(block?.dataset.calendarPlan),minute=calendarMinute(event);
      calendarGesture={date:event.target.closest('.time-lane')?.dataset.calendarDate||agendaDay,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,anchor:minute,mode:!plan?(event.altKey?'create':'select'):event.target.closest('[data-resize-start]')?'start':event.target.closest('[data-resize-end]')?'end':'move',copy:(!!event.shiftKey||!!event.target.closest('[data-repeat-pull]'))&&!!plan&&plan!==pendingPlan,planId:plan?.id,original:plan?{time:plan.time,duration:plan.duration,date:plan.date}:null,active:false};
      event.preventDefault();
    });
    document.addEventListener('pointermove',event=>{
      if(!calendarGesture||event.pointerId!==calendarGesture.pointerId)return;const gesture=calendarGesture;if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>3)gesture.active=true;event.preventDefault();
      if(gesture.mode==='select'){const left=Math.min(gesture.startX,event.clientX),right=Math.max(gesture.startX,event.clientX),top=Math.min(gesture.startY,event.clientY),bottom=Math.max(gesture.startY,event.clientY);selectedPlans.clear();$('scheduleRows').querySelectorAll('[data-calendar-plan]').forEach(el=>{const r=el.getBoundingClientRect();if(r.left<right&&r.right>left&&r.top<bottom&&r.bottom>top)selectedPlans.add(el.dataset.calendarPlan);});renderPlanCalendar();return;}
      if(gesture.copy&&gesture.active&&!gesture.copied){const copy=copyCalendarPlan(planById(gesture.planId));gesture.planId=copy.id;gesture.copied=true;}
      if(gesture.mode==='days'){const cell=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('[data-calendar-date]');if(cell?.dataset.calendarDate){const plan=planById(gesture.planId);stretchPlanToDay(plan,cell.dataset.calendarDate,gesture.original);renderPlanCalendar();}return;}
      const minute=calendarMinute(event),window=plannerState.agendaWindow||cleanWindow();
      if(gesture.mode==='create'){const start=Math.min(gesture.anchor,minute),finish=Math.max(gesture.anchor+15,minute);const lane=event.target.closest?.('.time-lane')||$('calendarLane');const laneRect=lane.getBoundingClientRect(),allRect=$('calendarLane').getBoundingClientRect();$('calendarGhost').style.left=(laneRect.left-allRect.left)+'px';$('calendarGhost').style.width=laneRect.width+'px';$('calendarGhost').hidden=false;$('calendarGhost').style.top=(start-minutesOf(window.start))/60*calendarScale+'px';$('calendarGhost').style.height=(finish-start)/60*calendarScale+'px';$('calendarGhost').textContent=digitalTime(timeOf(start))+' – '+digitalTime(timeOf(finish));}
      else{const plan=planById(gesture.planId),originalStart=minutesOf(gesture.original.time),originalEnd=originalStart+gesture.original.duration;if(gesture.mode==='move'){const targetLane=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('.time-lane');if(targetLane?.dataset.calendarDate)plan.date=dayKey(addDays(new Date(gesture.original.date+'T12:00:00'),dayDistance(gesture.date,targetLane.dataset.calendarDate)));plan.time=timeOf(Math.max(0,Math.min(1425,originalStart+minute-gesture.anchor)));}else if(gesture.mode==='end'){const lane=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('.time-lane'),targetDate=lane?.dataset.calendarDate||gesture.date;plan.duration=Math.max(15,Math.min(527040,dayDistance(plan.date,targetDate)*1440+minute-originalStart));}else{const lane=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('.time-lane'),targetDate=lane?.dataset.calendarDate||gesture.date,relativeStart=dayDistance(gesture.original.date,targetDate)*1440+minute,absoluteStart=Math.min(originalEnd-15,relativeStart);const dayShift=Math.floor(absoluteStart/1440);plan.date=dayKey(addDays(new Date(gesture.original.date+'T12:00:00'),dayShift));plan.time=timeOf((absoluteStart%1440+1440)%1440);plan.duration=originalEnd-absoluteStart;}renderPlanCalendar();}
    },{passive:false});
    document.addEventListener('pointerup',event=>{if(!calendarGesture||event.pointerId!==calendarGesture.pointerId)return;const gesture=calendarGesture;calendarGesture=null;$('calendarGhost').hidden=true;suppressPullClickUntil=gesture.active?Date.now()+300:0;
      if(gesture.mode==='select'){if(!gesture.active){selectedPlans.clear();return;}activeScheduleId=null;renderReport();return;}
      if(gesture.mode==='create'){if(!gesture.active){suppressPullClickUntil=0;return;}agendaDay=gesture.date;const minute=calendarMinute(event),start=Math.min(1425,Math.min(gesture.anchor,minute)),finish=Math.max(start+15,gesture.active?Math.max(gesture.anchor,minute):start+30);scheduleDraft.time=timeOf(start);scheduleDraft.duration=Math.min(1440-start,finish-start);createPlan('','',true);const input=$('scheduleInspector').querySelector?.('[data-plan-field="title"]');input?.focus();input?.select();}
      else{const plan=planById(gesture.planId);if(!gesture.active){suppressPullClickUntil=0;return;}agendaDay=plan.date;activeScheduleId=null;selectedPlans.clear();selectedPlans.add(plan.id);if(gesture.active&&plan!==pendingPlan){recordPlanEvent('plan_time_changed',plan,{from:gesture.original,to:{time:plan.time,duration:plan.duration},source:'calendar_drag'});persist();}renderReport();}
    });
    document.addEventListener('pointercancel',()=>{if(calendarGesture?.copied){plannerState.schedule=plannerState.schedule.filter(p=>p.id!==calendarGesture.planId);}else if(calendarGesture?.original){const plan=planById(calendarGesture.planId);if(plan)Object.assign(plan,calendarGesture.original);}calendarGesture=null;$('calendarGhost').hidden=true;renderPlanCalendar();});
    document.addEventListener('dblclick',event=>{const block=event.target.closest('[data-calendar-plan]');if(block){selectedPlans.clear();activeScheduleId=block.dataset.calendarPlan;renderReport();return;}if(!['day','week'].includes(agendaView)||!event.target.closest('#calendarLane')||event.target.closest('[data-calendar-plan],button,input,.calendar-editor'))return;event.preventDefault();agendaDay=event.target.closest('.time-lane')?.dataset.calendarDate||agendaDay;scheduleDraft.time=timeOf(Math.min(1425,calendarMinute(event)));scheduleDraft.duration=30;createPlan('','',true);$('scheduleInspector').querySelector?.('[data-plan-field="title"]')?.focus();});
    document.addEventListener('keydown',event=>{
      if(event.target.closest('input,textarea,[contenteditable="true"]'))return;
      if(event.key==='Delete'||event.key==='Backspace'){if(selectedPlans.size){event.preventDefault();for(const id of selectedPlans)removeCalendarPlan(id);selectedPlans.clear();}else if(activeScheduleId){event.preventDefault();removeCalendarPlan(activeScheduleId);}else{const card=event.target.closest('[data-goal-id]');if(card){event.preventDefault();deleteGoal(card.dataset.goalId);}}}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'&&(activeScheduleId||selectedPlans.size)){const plans=[...new Set([...selectedPlans,...(activeScheduleId?[activeScheduleId]:[])])].map(planById).filter(p=>p&&p!==pendingPlan);if(plans.length){event.preventDefault();selectedPlans.clear();plans.forEach(p=>selectedPlans.add(copyCalendarPlan(p).id));activeScheduleId=null;persist();renderReport();}}
    });
    $('librarySearch').addEventListener('input',event=>{librarySearch=event.target.value;renderTaskLibrary();});
    const updateBlockField=event=>{const field=event.target.closest('[data-plan-field]');if(field){const plan=planById(field.dataset.plan);if(!plan)return;const previous={title:plan.title,time:plan.time,duration:plan.duration},name=field.dataset.planField;
      if(name==='time'&&field.value)plan.time=field.value;else if(name==='end'&&field.value){let duration=dayDistance(plan.date,planLastDay(plan))*1440+(field.value==='00:00'?1440:minutesOf(field.value))-minutesOf(plan.time);if(duration<=0)duration+=1440;plan.duration=duration;}else if(name==='duration')plan.duration=Math.max(1,Math.min(527040,Math.round(Number(field.value)||45)));else if(name==='title')plan.title=field.value.trim()||plan.title;
      if(name==='title')$('libraryMode').textContent='Category for '+plan.title;updateScheduleTotal();if(previous.title===plan.title&&previous.time===plan.time&&previous.duration===plan.duration)return;if(plan===pendingPlan){if(name==='title')plan.touched=true;commitPendingPlan(plan);renderPlanCalendar();return;}recordPlanEvent('plan_edited',plan,{from:previous,to:{title:plan.title,time:plan.time,duration:plan.duration}});persist();renderPlanCalendar();return;}
      const note=event.target.closest('[data-plan-note-edit]');if(note){const plan=planById(note.dataset.plan),entry=plan?.notes.find(n=>n.id===note.dataset.planNoteEdit);if(entry){entry.text=note.value;recordPlanEvent('plan_note_edited',plan,{note:entry});persist();}}};
    document.addEventListener('input',updateBlockField);document.addEventListener('change',updateBlockField);
    document.addEventListener('keydown',event=>{const input=event.target.closest('[data-plan-note]');if(!input||event.key!=='Enter')return;event.preventDefault();const plan=planById(input.dataset.planNote),text=input.value.trim();if(!plan||!text)return;const note={id:generateId(),text};plan.notes.push(note);if(plan===pendingPlan){plan.touched=true;commitPendingPlan(plan);}recordPlanEvent('plan_note_added',plan,{note});input.value='';persist();renderReport();$('scheduleInspector').querySelector?.('[data-plan-note="'+plan.id+'"]')?.focus();});
    $('hourWheel').addEventListener('scroll',()=>{wheelHour=Math.max(0,Math.min(23,Math.round($('hourWheel').scrollTop/44)));updateWheelSelection();});
    $('minuteWheel').addEventListener('scroll',()=>{wheelMinute=Math.max(0,Math.min(3,Math.round($('minuteWheel').scrollTop/44)))*15;updateWheelSelection();});
    $('saveTaskTime').addEventListener('click',()=>saveTaskTime());$('clearTaskTime').addEventListener('click',()=>saveTaskTime(true));
    $('allTagsBtn').addEventListener('click',()=>{showAllTags=!showAllTags;updateConnectionUI();});
    $('renameDirectoryBtn').addEventListener('click',renameDirectory);
    $('directoryName').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();renameDirectory();}});
    $('chooseGoalDate').addEventListener('click',()=>openDraftDate('start'));
    $('chooseFinishDate').addEventListener('click',()=>openDraftDate(repeatEnabled?'end':'finish'));
    $('clearFinishDate').addEventListener('click',()=>{if($('fieldFinish').value)$('fieldMilestone').value=$('fieldFinish').value;$('fieldFinish').value='';updateScheduleUI();});
    $('chooseRepeatEnd').addEventListener('click',()=>openDraftDate('end'));
    $('repeatToggle').addEventListener('click',()=>{repeatEnabled=!repeatEnabled;if(repeatEnabled){if(!$('fieldMilestone').value)$('fieldMilestone').value=dayKey(localToday());if(!$('fieldRepeatEnd').value)$('fieldRepeatEnd').value=$('fieldFinish').value||dayKey(addDays(new Date($('fieldMilestone').value+'T12:00:00'),9));}else if($('fieldRepeatEnd').value)$('fieldFinish').value=$('fieldRepeatEnd').value;updateScheduleUI();});
    $('repeatInterval').addEventListener('input',updateScheduleUI);
    $('editorNoteInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addDraftInput();}});
    $('quickNoteInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addQuickNote();}});
    document.addEventListener('change',event=>{const input=event.target.closest('[data-edit-note]');if(input)editNote(input.dataset.editNote,input.value,input.dataset.notesContext);});
    $('resetEditorProgress').addEventListener('click',()=>{if(editingId)resetProgress(editingId);});
    $('inheritMarker').addEventListener('click',()=>{const goal=goalById(markerGoalId);if(goal){goal.flagColor=null;goal.flagShape=null;recordAction('marker_changed',goal,{color:null,shape:null});persist();refreshTaskViews();$('markerDialog').close();}});
    $('suggestBtn').addEventListener('click',()=>{if(FEEDBACK_REPO)window.open('https://github.com/'+FEEDBACK_REPO+'/issues/new?title=Suggestion&body=Describe%20your%20suggestion%20here.%20Do%20not%20include%20private%20plans.','_blank','noopener');else $('suggestDialog').showModal();});
    $('moveTomorrowBtn').addEventListener('click',()=>rescheduleGoal(reschedulingId,dayKey(addDays(localToday(),1))));
    $('closeReschedule').addEventListener('click',closeReschedule);
    $('rescheduleDialog').addEventListener('close',()=>{reschedulingId=null;});
    $('calendarPrevious').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1,12);renderCalendar();});
    $('calendarNext').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1,12);renderCalendar();});
    $('connectFolderBtn').addEventListener('click',()=>connectFolder(fileSavingAvailable?null:folderHandle));
    $('newProjectBtn').addEventListener('click',()=>openEditor(null,'todo',true));
    $('bigPictureBtn').addEventListener('click',()=>{activeView='report';render();});
    $('taskViewBtn').addEventListener('click',()=>{activeView='board';render();});
    $('editProjectBtn').addEventListener('click',()=>openEditor(selectedProject));
    $('searchInput').addEventListener('input',event=>{searchTerm=event.target.value.toLowerCase().trim();renderBoard();});
    $('newGoalBtn').addEventListener('click',()=>{if(activeView==='report'){scheduleDraft.title='';createPlan('','',true);}else openEditor();});$('addGoalToolbar').addEventListener('click',()=>openEditor());
    $('closeDrawer').addEventListener('click',closeEditor);$('cancelGoalBtn').addEventListener('click',closeEditor);$('drawerOverlay').addEventListener('click',closeEditor);
    $('goalForm').addEventListener('submit',saveForm);$('deleteGoalBtn').addEventListener('click',()=>deleteGoal());
    $('exportBtn').addEventListener('click',exportBackup);$('importBtn').addEventListener('click',()=>$('fileInput').click());$('fileInput').addEventListener('change',event=>importBackup(event.target.files[0]));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){selectedPlans.clear();renderPlanCalendar();closeEditor();closeReschedule();if(activeScheduleId)dismissPlanEditor();}});
  }
  $('todayLabel').textContent=new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  window.PLANNER_OPEN_GOOGLE=timestamp=>{const date=new Date(timestamp);agendaDay=dayKey(date);agendaView='day';plannerState.agendaWindow={start:'00:00',end:'24:00'};activeScheduleId=null;renderReport();const block=$('scheduleRows').querySelector?.('.google-busy');block?.scrollIntoView?.({block:'center',behavior:'smooth'});};
  $('calendarViewport').addEventListener('wheel',zoomCalendar,{passive:false});
  window.addEventListener('resize',()=>{if(activeView==='report'){renderPlanCalendar();positionCalendarEditor();}});
  window.addEventListener('beforeunload',event=>{if(pendingSave){event.preventDefault();event.returnValue='';}});
  window.addEventListener('online',()=>{if(pendingSave&&fileSavingAvailable)persist();});
  setInterval(()=>{if(pendingSave&&fileSavingAvailable)persist();},10000);
  attachEvents();
  initializeFileSaving();
  setInterval(()=>{if(dayKey(localToday())!==lastRenderedDay&&!editingId&&!draggingId&&!$('rescheduleDialog').open)refreshTaskViews();},60000);
})();
