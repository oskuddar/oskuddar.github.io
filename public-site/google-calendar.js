// Read-only Google availability. Tokens and responses stay in memory, never planner files.
(() => {
  const scope='https://www.googleapis.com/auth/calendar.events.readonly';
  const detail=event=>[event.summary||'(Untitled event)',event.location||'',event.description||''].filter(Boolean).join('\n');
  let token='',expires=0,client,context,cache=null,inflight='',generation=0,loading;
  const el=id=>document.getElementById(id);
  function showDetails(busy){let panel=el('googleEventDetails');if(!panel){panel=document.createElement('div');panel.id='googleEventDetails';el('googleCalendarStatus').after(panel);}panel.textContent=detail(busy);panel.style.whiteSpace='pre-wrap';}
  function status(text){el('googleCalendarStatus').textContent=text;}
  function controls(){el('googleCalendarConnect').textContent=token?'Reconnect Google':'Connect Google Calendar';el('googleCalendarDisconnect').hidden=!token;el('googleCalendarRefresh').hidden=!token;}
  function loadIdentity(){
    if(window.google?.accounts?.oauth2)return Promise.resolve();
    return loading??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=()=>{loading=null;reject(Error('Google sign-in could not load. Check your internet connection.'));};document.head.appendChild(script);});
  }
  async function connect(){
    if(!/^https?:$/.test(location.protocol)){status('Open the hosted planner to connect Google. Local files cannot use Google sign-in.');return;}
    const id=window.ORBIT_CONFIG?.googleClientId;if(!id){status('Google Client ID is missing.');return;}
    try{await loadIdentity();client??=window.google.accounts.oauth2.initTokenClient({client_id:id,scope,callback:response=>{
      if(response.error){status('Google access was not granted. Your local plans are unchanged.');return;}
      if(!window.google.accounts.oauth2.hasGrantedAllScopes(response,scope)){status('Allow access to read-only calendar events to display details.');return;}
      status('Google authorized · preparing availability…');token=response.access_token;expires=Date.now()+Number(response.expires_in||3600)*1000;cache=null;generation++;controls();refresh();
    },error_callback:()=>status('Sign-in closed or blocked. Click Connect Google Calendar to retry.')});client.requestAccessToken();}catch(error){status(error.message);}
  }
  function paint(){
    document.querySelectorAll('.google-busy').forEach(node=>node.remove());
    if(!context||!cache)return;let visible=0;
    if(!['day','week'].includes(context.view)){
      document.querySelectorAll('.month-cell[data-calendar-date],.year-month [data-calendar-date]').forEach(cell=>{
        const base=new Date(cell.dataset.calendarDate+'T00:00:00'),next=new Date(base);next.setDate(next.getDate()+1);
        for(const busy of cache.busy){const from=new Date(busy.start),to=new Date(busy.end);if(to<=base||from>=next)continue;visible++;
          const marker=document.createElement('span');marker.className='google-busy google-busy-marker';marker.title=detail(busy);marker.addEventListener('click',event=>{event.stopPropagation();showDetails(busy);});marker.textContent=context.view==='year'?' ●':(busy.summary||'(Untitled event)')+' · '+(busy.allDay?'all day':from.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));Object.assign(marker.style,{display:'block',background:'rgba(66,133,244,.22)',color:'#24589b',fontSize:'11px',padding:'2px',borderRadius:'3px',position:'static'});cell.appendChild(marker);
        }
      });
    }
    document.querySelectorAll('.time-lane').forEach(lane=>{
      const day=lane.dataset.calendarDate,base=new Date(day+'T00:00:00'),next=new Date(base);next.setDate(next.getDate()+1);
      for(const busy of cache.busy){const from=new Date(busy.start),to=new Date(busy.end);if(to<=base||from>=next)continue;
        const begin=from<base?0:from.getHours()*60+from.getMinutes(),finish=to>=next?1440:to.getHours()*60+to.getMinutes(),start=Math.max(context.start,begin),end=Math.min(context.end,finish);if(end<=start)continue;
        visible++;const block=document.createElement('div');block.className='google-busy';Object.assign(block.style,{position:'absolute',left:'1px',right:'1px',background:'rgba(66,133,244,.22)',border:'1px solid rgba(66,133,244,.55)',color:'#24589b',fontSize:'12px',padding:'3px',pointerEvents:'none',zIndex:'0',boxSizing:'border-box'});block.style.top=(start-context.start)/60*context.scale+'px';block.style.height=(end-start)/60*context.scale+'px';block.textContent=(busy.summary||'(Untitled event)')+' · '+(busy.allDay?'All day':from.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));block.title=detail(busy);block.style.pointerEvents='auto';block.addEventListener('click',event=>{event.stopPropagation();showDetails(busy);});block.setAttribute('aria-label',detail(busy));lane.prepend(block);
      }
    });
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    status('Google connected · '+visible+' visible / '+cache.busy.length+' loaded · '+tz+(visible?'':' · No events within the displayed dates/hours'));
    let jump=el('googleCalendarShowBusy');if(!jump){jump=document.createElement('button');jump.id='googleCalendarShowBusy';jump.type='button';jump.textContent='Show next busy time';jump.addEventListener('click',()=>{const sorted=cache?.busy.slice().sort((a,b)=>new Date(a.start)-new Date(b.start))||[],entry=sorted.find(b=>new Date(b.end)>new Date())||sorted[0];if(entry){if(window.PLANNER_OPEN_GOOGLE)window.PLANNER_OPEN_GOOGLE(entry.start);else status('Please upload the matching app.js too, then reload. Calendar navigation code is outdated.');}});el('googleCalendarStatus').after(jump);}jump.hidden=!!visible||!cache.busy.length;
    let list=el('googleBusyDates');if(!list){list=document.createElement('div');list.id='googleBusyDates';el('googleCalendarStatus').after(list);}list.replaceChildren();
    if(!visible)for(const busy of cache.busy.slice(0,5)){const button=document.createElement('button');button.type='button';button.textContent=new Date(busy.start).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});button.addEventListener('click',()=>{if(window.PLANNER_OPEN_GOOGLE)window.PLANNER_OPEN_GOOGLE(busy.start);else status('Upload the matching app.js and reload to open this date.');});list.appendChild(button);}

  }
  async function refresh(force=false){
    if(!token||!context)return;
    if(Date.now()>=expires){token='';cache=null;generation++;controls();paint();status('Google connection expired. Reconnect to refresh busy times.');return;}
    const date=new Date(context.date+'T12:00:00'),start=new Date(date.getFullYear(),context.view==='year'?0:date.getMonth(),1);start.setDate(start.getDate()-7);const end=new Date(date.getFullYear(),context.view==='year'?12:date.getMonth()+1,8),key=start.toISOString()+'/'+end.toISOString();
    if(!force&&cache?.key===key){paint();return;}if(inflight===key)return;
    const run=generation;inflight=key;status('Loading Google events…');
    try{let page='',events=[];do{
      const params=new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'2500'});if(page)params.set('pageToken',page);
      const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+params,{headers:{Authorization:'Bearer '+token}});
      if(run!==generation)return;
      if(response.status===401){token='';cache=null;controls();throw Error('Google connection expired. Reconnect Google.');}
      if(response.status===403)throw Error('Reconnect Google and allow read-only event details. Check Google Calendar API is enabled.');
      if(!response.ok)throw Error('Could not load Google events. Try Refresh.');
      const data=await response.json();events.push(...(data.items||[]));page=data.nextPageToken||'';
    }while(page);
    if(run!==generation)return;
    cache={key,busy:events.filter(e=>e.status!=='cancelled'&&e.start&&e.end).map(e=>({start:e.start.dateTime||e.start.date+'T00:00:00',end:e.end.dateTime||e.end.date+'T00:00:00',allDay:!!e.start.date,summary:e.summary,description:e.description,location:e.location}))};paint();
    }catch(error){if(run===generation){cache=null;paint();status(error.message);}}finally{if(inflight===key)inflight='';}
  }
  el('googleCalendarConnect').addEventListener('click',connect);
  el('googleCalendarRefresh').addEventListener('click',()=>refresh(true));
  el('googleCalendarDisconnect').addEventListener('click',()=>{const old=token;token='';expires=0;cache=null;generation++;inflight='';paint();if(el('googleCalendarShowBusy'))el('googleCalendarShowBusy').hidden=true;if(el('googleBusyDates'))el('googleBusyDates').replaceChildren();if(el('googleEventDetails'))el('googleEventDetails').textContent='';controls();status('Google disconnected');if(old)window.google?.accounts?.oauth2.revoke(old,()=>{});});
  window.PLANNER_GOOGLE={render(value){context=value;paint();refresh();}};
})();
